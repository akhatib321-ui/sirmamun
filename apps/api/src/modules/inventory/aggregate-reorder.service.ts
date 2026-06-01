import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Queues, GenerateReorderJobData } from '../../jobs/queue-names';
import { ok } from '../../shared/response.envelope';

type LocationRow = { id: string; name: string; parentId: string | null };

type AggregateItem = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierType: string | null;
  supplierLeadTimeDays: number | null;
  maxUrgency: string;
  totalSuggestedQty: number;
  totalCurrentStock: number;
  minDaysUntilStockout: number | null;
  totalEstimatedCost: number | null;
  locationBreakdown: Array<{
    locationId: string;
    locationName: string;
    suggestedQty: number;
    currentStock: number | null;
    daysUntilStockout: number | null;
    urgency: string;
    estimatedCost: number | null;
    suggestionId: string;
    suggestionAge: number;
  }>;
};

type MarkOrderedPayload = {
  supplierId: string;
  deliveryLocationId?: string | null;
  expectedAt?: string | null;
  items: AggregateItem[];
};

const URGENCY_ORDER: Record<string, number> = {
  ORDER_TODAY: 3,
  ORDER_THIS_WEEK: 2,
  PLAN_AHEAD: 1,
};

function urgencyRank(value: string | null | undefined): number {
  if (!value) return 0;
  return URGENCY_ORDER[value] ?? 0;
}

@Injectable()
export class AggregateReorderService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(Queues.GENERATE_REORDER) private readonly reorderQueue: Queue,
  ) {}

  async getAggregate(organizationId: number) {
    const locations = await this.getParentLocations();

    if (!locations.length) {
      return ok({ summary: this.emptySummary(), items: [], locationStatuses: [] });
    }

    const perLocation = await Promise.all(
      locations.map(async (location) => {
        const suggestion = await this.prisma.reorderSuggestion.findFirst({
          where: { locationId: location.id, organizationId, status: 'PENDING' },
          orderBy: { generatedAt: 'desc' },
          include: {
            items: {
              include: {
                ingredient: { select: { id: true, name: true, unit: true } },
                supplier: { select: { id: true, name: true, type: true, leadTimeDays: true } },
              },
            },
          },
        });

        return { location, suggestion };
      }),
    );

    const merged = new Map<string, AggregateItem>();

    for (const { location, suggestion } of perLocation) {
      if (!suggestion) continue;

      const suggestionAge = Math.round((Date.now() - suggestion.generatedAt.getTime()) / (1000 * 60 * 60));

      for (const item of suggestion.items) {
        if (!merged.has(item.ingredientId)) {
          merged.set(item.ingredientId, {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredient.name,
            unit: item.ingredient.unit,
            supplierId: item.supplierId,
            supplierName: item.supplier?.name ?? null,
            supplierType: item.supplier?.type ?? null,
            supplierLeadTimeDays: item.supplier?.leadTimeDays ?? null,
            maxUrgency: item.urgency,
            totalSuggestedQty: 0,
            totalCurrentStock: 0,
            minDaysUntilStockout: null,
            totalEstimatedCost: null,
            locationBreakdown: [],
          });
        }

        const aggregate = merged.get(item.ingredientId)!;

        aggregate.totalSuggestedQty += item.suggestedQty;
        aggregate.totalCurrentStock += item.currentStockEstimate ?? 0;

        if (item.estimatedCost !== null) {
          aggregate.totalEstimatedCost = (aggregate.totalEstimatedCost ?? 0) + item.estimatedCost;
        }

        if (urgencyRank(item.urgency) > urgencyRank(aggregate.maxUrgency)) {
          aggregate.maxUrgency = item.urgency;
        }

        if (
          item.daysUntilStockout !== null &&
          (aggregate.minDaysUntilStockout === null || item.daysUntilStockout < aggregate.minDaysUntilStockout)
        ) {
          aggregate.minDaysUntilStockout = item.daysUntilStockout;
        }

        aggregate.locationBreakdown.push({
          locationId: location.id,
          locationName: location.name,
          suggestedQty: item.suggestedQty,
          currentStock: item.currentStockEstimate,
          daysUntilStockout: item.daysUntilStockout,
          urgency: item.urgency,
          estimatedCost: item.estimatedCost,
          suggestionId: suggestion.id,
          suggestionAge,
        });
      }
    }

    const items = Array.from(merged.values()).sort((a, b) => {
      const urgencyDiff = urgencyRank(b.maxUrgency) - urgencyRank(a.maxUrgency);
      if (urgencyDiff !== 0) return urgencyDiff;
      const aDays = a.minDaysUntilStockout ?? Number.MAX_SAFE_INTEGER;
      const bDays = b.minDaysUntilStockout ?? Number.MAX_SAFE_INTEGER;
      return aDays - bDays;
    });

    const locationStatuses = perLocation.map(({ location, suggestion }) => ({
      locationId: location.id,
      locationName: location.name,
      hasData: !!suggestion,
      generatedAt: suggestion?.generatedAt ?? null,
      ageHours: suggestion ? Math.round((Date.now() - suggestion.generatedAt.getTime()) / (1000 * 60 * 60)) : null,
      itemCount: suggestion?.items.length ?? 0,
    }));

    const summary = {
      orderToday: items.filter((i) => i.maxUrgency === 'ORDER_TODAY').length,
      orderThisWeek: items.filter((i) => i.maxUrgency === 'ORDER_THIS_WEEK').length,
      planAhead: items.filter((i) => i.maxUrgency === 'PLAN_AHEAD').length,
      totalEstimatedCost: items.reduce((sum, i) => sum + (i.totalEstimatedCost ?? 0), 0),
      locationCount: locationStatuses.filter((s) => s.hasData).length,
      staleLocations: locationStatuses.filter((s) => (s.ageHours ?? 0) > 72).length,
    };

    return ok({ summary, items, locationStatuses });
  }

  async recalculateAll(organizationId: number, windowDays = 7) {
    const locations = await this.getParentLocations();

    const jobs = await Promise.all(
      locations.map((location) => {
        const data: GenerateReorderJobData = {
          locationId: location.id,
          organizationId,
          triggerType: 'MANUAL',
          windowDays,
        };
        return this.reorderQueue.add('generate', data, { priority: 2 });
      }),
    );

    return ok({
      queued: jobs.length,
      locationIds: locations.map((l) => l.id),
      message: `Reorder calculation queued for ${jobs.length} location${jobs.length !== 1 ? 's' : ''}.`,
    });
  }

  async buildCombinedOrder(organizationId: number, ingredientIds: string[]) {
    const aggregate = await this.getAggregate(organizationId);
    const payload = (aggregate as any).data ?? {};
    const items: AggregateItem[] = payload.items ?? [];

    const selected = items.filter((i) => ingredientIds.includes(i.ingredientId));

    const supplierGroupsMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      supplierType: string;
      leadTimeDays: number | null;
      subtotal: number;
      items: AggregateItem[];
    }>();

    for (const item of selected) {
      const supplierKey = item.supplierId ?? 'unknown';
      if (!supplierGroupsMap.has(supplierKey)) {
        supplierGroupsMap.set(supplierKey, {
          supplierId: item.supplierId ?? 'unknown',
          supplierName: item.supplierName ?? 'No supplier',
          supplierType: item.supplierType ?? 'OPERATIONAL',
          leadTimeDays: item.supplierLeadTimeDays,
          subtotal: 0,
          items: [],
        });
      }

      const group = supplierGroupsMap.get(supplierKey)!;
      group.items.push(item);
      group.subtotal += item.totalEstimatedCost ?? 0;
    }

    const locations = await this.getParentLocations();

    return ok({
      supplierGroups: Array.from(supplierGroupsMap.values()),
      locations,
      grandTotal: selected.reduce((sum, item) => sum + (item.totalEstimatedCost ?? 0), 0),
    });
  }

  async markCombinedOrder(
    organizationId: number,
    createdBy: string,
    payload: MarkOrderedPayload,
  ) {
    if (!payload?.supplierId || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new BadRequestException('supplierId and items are required');
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: payload.supplierId, organizationId },
      select: { id: true, name: true, type: true },
    });

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const createdOrderIds: string[] = [];
    const expectedAt = payload.expectedAt ? new Date(payload.expectedAt) : null;

    if (supplier.type === 'OPERATIONAL') {
      const byLocation = new Map<string, {
        items: Array<{ ingredientId: string; qtyOrdered: number; unit: string; unitCost: number }>;
      }>();

      for (const item of payload.items) {
        for (const split of item.locationBreakdown || []) {
          if (!split.locationId || split.suggestedQty <= 0) continue;

          if (!byLocation.has(split.locationId)) {
            byLocation.set(split.locationId, { items: [] });
          }

          const derivedUnitCost = split.estimatedCost != null && split.suggestedQty > 0
            ? split.estimatedCost / split.suggestedQty
            : (item.totalEstimatedCost != null && item.totalSuggestedQty > 0
                ? item.totalEstimatedCost / item.totalSuggestedQty
                : 0);

          byLocation.get(split.locationId)!.items.push({
            ingredientId: item.ingredientId,
            qtyOrdered: split.suggestedQty,
            unit: item.unit,
            unitCost: Number.isFinite(derivedUnitCost) ? derivedUnitCost : 0,
          });
        }
      }

      for (const [locationId, group] of byLocation.entries()) {
        if (!group.items.length) continue;

        const totalCost = group.items.reduce((sum, item) => sum + item.qtyOrdered * item.unitCost, 0);

        const order = await this.prisma.supplierOrder.create({
          data: {
            supplierId: supplier.id,
            locationId,
            organizationId,
            createdBy,
            expectedAt,
            totalCost,
            notes: 'Aggregate combined order (operational split by location)',
            items: {
              create: group.items,
            },
          },
          select: { id: true },
        });

        createdOrderIds.push(order.id);
      }
    } else {
      const fallbackLocationId = payload.items[0]?.locationBreakdown?.[0]?.locationId ?? null;
      const deliveryLocationId = payload.deliveryLocationId || fallbackLocationId;

      if (!deliveryLocationId) {
        throw new BadRequestException('deliveryLocationId is required for non-operational suppliers');
      }

      const orderItems = payload.items
        .filter((item) => item.totalSuggestedQty > 0)
        .map((item) => {
          const derivedUnitCost = item.totalEstimatedCost != null && item.totalSuggestedQty > 0
            ? item.totalEstimatedCost / item.totalSuggestedQty
            : 0;

          return {
            ingredientId: item.ingredientId,
            qtyOrdered: item.totalSuggestedQty,
            unit: item.unit,
            unitCost: Number.isFinite(derivedUnitCost) ? derivedUnitCost : 0,
          };
        });

      const locationSplitNote = payload.items
        .map((item) => {
          const split = (item.locationBreakdown || [])
            .map((lb) => `${lb.locationName}: ${Number(lb.suggestedQty).toFixed(1)} ${item.unit}`)
            .join(' | ');
          return `${item.ingredientName} -> ${split}`;
        })
        .join('; ');

      const totalCost = orderItems.reduce((sum, item) => sum + item.qtyOrdered * item.unitCost, 0);

      const order = await this.prisma.supplierOrder.create({
        data: {
          supplierId: supplier.id,
          locationId: deliveryLocationId,
          organizationId,
          createdBy,
          expectedAt,
          totalCost,
          notes: `Aggregate combined order (single delivery location). Split reference: ${locationSplitNote}`,
          items: {
            create: orderItems,
          },
        },
        select: { id: true },
      });

      createdOrderIds.push(order.id);
    }

    return ok({
      supplierId: supplier.id,
      supplierType: supplier.type,
      createdOrders: createdOrderIds.length,
      orderIds: createdOrderIds,
    });
  }

  private async getParentLocations(): Promise<LocationRow[]> {
    const locations = await this.prisma.location.findMany({ orderBy: { name: 'asc' } });
    return locations.filter((l) => !l.parentId);
  }

  private emptySummary() {
    return {
      orderToday: 0,
      orderThisWeek: 0,
      planAhead: 0,
      totalEstimatedCost: 0,
      locationCount: 0,
      staleLocations: 0,
    };
  }
}
