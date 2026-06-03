// apps/api/src/modules/inventory/aggregate-reorder.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reads the latest PENDING ReorderSuggestion for each location and merges
// them by ingredient into a single org-level view.
//
// No schema changes. Pure aggregation on top of existing data.
//
// Key decisions:
//   - Urgency = worst case across locations (one location at ORDER_TODAY
//     means the ingredient is ORDER_TODAY in the aggregate)
//   - Suggested qty = sum across locations (each location needs its own qty)
//   - daysUntilStockout = minimum across locations (most urgent location drives timing)
//   - Estimated cost = sum across locations
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Queues, GenerateReorderJobData } from '../../jobs/queue-names';
import { ok } from '../../shared/response.envelope';

const URGENCY_ORDER = { ORDER_TODAY: 3, ORDER_THIS_WEEK: 2, PLAN_AHEAD: 1 };

function urgencyRank(u: string | null): number {
  return URGENCY_ORDER[u as keyof typeof URGENCY_ORDER] ?? 0;
}

export interface LocationBreakdown {
  locationId:       string;
  locationName:     string;
  suggestedQty:     number;
  currentStock:     number | null;
  daysUntilStockout:number | null;
  urgency:          string;
  estimatedCost:    number | null;
  suggestionId:     string;
  suggestionAge:    number; // hours since generated — flags stale data
}

export interface AggregateItem {
  ingredientId:        string;
  ingredientName:      string;
  unit:                string;
  supplierId:          string | null;
  supplierName:        string | null;
  supplierType:        string | null;
  supplierLeadTimeDays:number | null;
  maxUrgency:          string;
  totalSuggestedQty:   number;
  totalCurrentStock:   number;
  minDaysUntilStockout:number | null;
  totalEstimatedCost:  number | null;
  locationBreakdown:   LocationBreakdown[];
}

@Injectable()
export class AggregateReorderService {
  private readonly logger = new Logger(AggregateReorderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(Queues.GENERATE_REORDER) private readonly reorderQueue: Queue,
  ) {}

  // ─── Main aggregate view ─────────────────────────────────────────────────

  async getAggregate(organizationId: number) {
    // Get all locations for this org
    const locations = await this.getLocations(organizationId);

    if (!locations.length) {
      return ok({ summary: this.emptySummary(), items: [], locationStatuses: [] });
    }

    // Fetch latest PENDING suggestion per location
    const perLocation = await Promise.all(
      locations.map(async loc => {
        const suggestion = await this.prisma.reorderSuggestion.findFirst({
          where: { locationId: loc.id, organizationId, status: 'PENDING' },
          orderBy: { generatedAt: 'desc' },
          include: {
            items: {
              include: {
                ingredient: { select: { id: true, name: true, unit: true } },
                supplier:   { select: { id: true, name: true, type: true, leadTimeDays: true } },
              },
            },
          },
        });
        return { location: loc, suggestion };
      })
    );

    // Merge items by ingredient
    const merged = new Map<string, AggregateItem>();

    for (const { location, suggestion } of perLocation) {
      if (!suggestion) continue;

      const ageHours = Math.round(
        (Date.now() - suggestion.generatedAt.getTime()) / (1000 * 60 * 60)
      );

      for (const item of suggestion.items) {
        const key = item.ingredientId;

        if (!merged.has(key)) {
          merged.set(key, {
            ingredientId:         item.ingredientId,
            ingredientName:       item.ingredient.name,
            unit:                 item.ingredient.unit,
            supplierId:           item.supplierId,
            supplierName:         item.supplier?.name ?? null,
            supplierType:         item.supplier?.type ?? null,
            supplierLeadTimeDays: item.supplier?.leadTimeDays ?? null,
            maxUrgency:           item.urgency,
            totalSuggestedQty:    0,
            totalCurrentStock:    0,
            minDaysUntilStockout: null,
            totalEstimatedCost:   null,
            locationBreakdown:    [],
          });
        }

        const agg = merged.get(key)!;

        // Accumulate
        agg.totalSuggestedQty += item.suggestedQty;
        agg.totalCurrentStock += item.currentStockEstimate ?? 0;

        if (item.estimatedCost !== null) {
          agg.totalEstimatedCost = (agg.totalEstimatedCost ?? 0) + item.estimatedCost;
        }

        // Worst-case urgency across locations
        if (urgencyRank(item.urgency) > urgencyRank(agg.maxUrgency)) {
          agg.maxUrgency = item.urgency;
        }

        // Earliest stockout across locations (most urgent drives the timeline)
        if (
          item.daysUntilStockout !== null &&
          (agg.minDaysUntilStockout === null || item.daysUntilStockout < agg.minDaysUntilStockout)
        ) {
          agg.minDaysUntilStockout = item.daysUntilStockout;
        }

        agg.locationBreakdown.push({
          locationId:        location.id,
          locationName:      location.name,
          suggestedQty:      item.suggestedQty,
          currentStock:      item.currentStockEstimate,
          daysUntilStockout: item.daysUntilStockout,
          urgency:           item.urgency,
          estimatedCost:     item.estimatedCost,
          suggestionId:      suggestion.id,
          suggestionAge:     ageHours,
        });
      }
    }

    // Sort: urgency desc, then min days asc
    const items = Array.from(merged.values()).sort((a, b) => {
      const urgencyDiff = urgencyRank(b.maxUrgency) - urgencyRank(a.maxUrgency);
      if (urgencyDiff !== 0) return urgencyDiff;
      const aDays = a.minDaysUntilStockout ?? 999;
      const bDays = b.minDaysUntilStockout ?? 999;
      return aDays - bDays;
    });

    // Location status summary (for staleness warnings)
    const locationStatuses = perLocation.map(({ location, suggestion }) => ({
      locationId:   location.id,
      locationName: location.name,
      hasData:      !!suggestion,
      generatedAt:  suggestion?.generatedAt ?? null,
      ageHours:     suggestion
        ? Math.round((Date.now() - suggestion.generatedAt.getTime()) / (1000 * 60 * 60))
        : null,
      itemCount:    suggestion?.items.length ?? 0,
    }));

    const summary = {
      orderToday:         items.filter(i => i.maxUrgency === 'ORDER_TODAY').length,
      orderThisWeek:      items.filter(i => i.maxUrgency === 'ORDER_THIS_WEEK').length,
      planAhead:          items.filter(i => i.maxUrgency === 'PLAN_AHEAD').length,
      totalEstimatedCost: items.reduce((s, i) => s + (i.totalEstimatedCost ?? 0), 0),
      locationCount:      locationStatuses.filter(l => l.hasData).length,
      staleLocations:     locationStatuses.filter(l => l.ageHours !== null && l.ageHours > 72).length,
    };

    return ok({ summary, items, locationStatuses });
  }

  // ─── Trigger recalculation for all locations ──────────────────────────────

  async recalculateAll(organizationId: number, windowDays = 7) {
    const locations = await this.getLocations(organizationId);

    const jobs = await Promise.all(
      locations.map(loc => {
        const data: GenerateReorderJobData = {
          locationId:   loc.id,
          organizationId,
          triggerType:  'MANUAL',
          windowDays,
        };
        return this.reorderQueue.add('generate', data, { priority: 2 });
      })
    );

    return ok({
      queued:      jobs.length,
      locationIds: locations.map(l => l.id),
      message:     `Reorder calculation queued for ${jobs.length} location${jobs.length !== 1 ? 's' : ''}. Check back in 15–20 seconds.`,
    });
  }

  // ─── Combined order list ──────────────────────────────────────────────────
  // Groups selected ingredients by supplier, returns structured data
  // the frontend uses to generate the order list and place orders.

  async buildCombinedOrder(
    organizationId: number,
    selectedIngredientIds: string[],
  ) {
    const aggregate = await this.getAggregate(organizationId);
    const items = (aggregate.data as any).items as AggregateItem[];

    const selected = items.filter(i => selectedIngredientIds.includes(i.ingredientId));

    // Group by supplier
    const bySupplier = new Map<string, {
      supplierId:   string;
      supplierName: string;
      supplierType: string;
      leadTimeDays: number | null;
      items:        AggregateItem[];
      subtotal:     number;
    }>();

    for (const item of selected) {
      const key = item.supplierId ?? 'unknown';
      if (!bySupplier.has(key)) {
        bySupplier.set(key, {
          supplierId:   item.supplierId ?? 'unknown',
          supplierName: item.supplierName ?? 'No supplier',
          supplierType: item.supplierType ?? 'OPERATIONAL',
          leadTimeDays: item.supplierLeadTimeDays,
          items:        [],
          subtotal:     0,
        });
      }
      const group = bySupplier.get(key)!;
      group.items.push(item);
      group.subtotal += item.totalEstimatedCost ?? 0;
    }

    const locations = await this.getLocations(organizationId);

    return ok({
      supplierGroups: Array.from(bySupplier.values()),
      locations,
      grandTotal: selected.reduce((s, i) => s + (i.totalEstimatedCost ?? 0), 0),
    });
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async getLocations(organizationId: number) {
    // Assumes locations table has organizationId or is accessible via org
    // Adjust the where clause to match your actual schema
    return this.prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
  }

  private emptySummary() {
    return {
      orderToday: 0, orderThisWeek: 0, planAhead: 0,
      totalEstimatedCost: 0, locationCount: 0, staleLocations: 0,
    };
  }
}
