// src/jobs/processors/generate-reorder.processor.ts
// ─────────────────────────────────────────────────────────────────────────────
// Calculates reorder suggestions for a location.
//
// For each ingredient with a preferred supplier:
//   1. Estimate current stock (snapshot + received orders - theoretical consumption)
//   2. Calculate daily consumption rate from last N days of sales
//   3. Determine days of stock remaining
//   4. Compare to supplier lead time × safety factor
//   5. If below threshold → add to suggestion with urgency tier
//
// Emits: reorder.suggestion.generated
// ─────────────────────────────────────────────────────────────────────────────

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Queues, GenerateReorderJobData } from '../queue-names';
import { Events } from '../../events/event-types';
import { ReorderSuggestionGeneratedPayload } from '../../events/event-payloads.interface';
import { convertToIngredientUnit } from '../../shared/uom.util';
import { StockChainService } from '../../modules/inventory/stock-chain.service';

@Processor(Queues.GENERATE_REORDER)
export class GenerateReorderProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateReorderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly stockChain: StockChainService,
  ) {
    super();
  }

  async process(job: Job<GenerateReorderJobData>): Promise<void> {
    const {
      locationId,
      organizationId,
      triggerType,
      triggerSourceId,
      windowDays = 7,
    } = job.data;

    this.logger.log(
      `Generating reorder for location ${locationId} (trigger: ${triggerType})`,
    );

    // Load all ingredients with a preferred supplier
    const ingredients = await this.prisma.ingredient.findMany({
      where: { organizationId },
      include: {
        supplierLinks: {
          where: { preferred: true },
          include: { supplier: true },
        },
        recipeIngredients: true,
      },
    });

    const suggestionItemInputs: Array<{
      ingredientId: string;
      supplierId: string;
      urgency: 'ORDER_TODAY' | 'ORDER_THIS_WEEK' | 'PLAN_AHEAD';
      suggestedQty: number;
      estimatedCost: number | null;
      currentStockEstimate: number;
      parLevelEstimate: number;
      daysUntilStockout: number;
      reason: string;
    }> = [];

    const chainResults = await this.stockChain.resolveAllForLocation(
      locationId,
      organizationId,
    );

    for (const ingredient of ingredients) {
      const preferredLink = ingredient.supplierLinks[0];
      if (!preferredLink) continue;

      const supplier = preferredLink.supplier;
      const { leadTimeDays, safetyFactor } = supplier;

      try {
        const { stock, dailyRate } = await this.calculateStockAndRate(
          ingredient.id,
          ingredient.unit,
          locationId,
          organizationId,
          windowDays,
          chainResults[ingredient.id],
        );

        // Skip ingredients with no sales history
        if (dailyRate <= 0) continue;

        const daysRemaining = stock / dailyRate;
        const triggerThreshold = leadTimeDays * safetyFactor;

        // Determine urgency — skip if stock is healthy
        let urgency: 'ORDER_TODAY' | 'ORDER_THIS_WEEK' | 'PLAN_AHEAD' | null = null;
        if (daysRemaining <= leadTimeDays) {
          urgency = 'ORDER_TODAY';
        } else if (daysRemaining <= triggerThreshold) {
          urgency = 'ORDER_THIS_WEEK';
        } else if (daysRemaining <= triggerThreshold * 1.5) {
          urgency = 'PLAN_AHEAD';
        }

        if (!urgency) continue;

        // Suggested quantity: cover lead time + window days, minus current stock
        const suggestedQty = Math.max(
          0,
          (leadTimeDays + windowDays) * dailyRate - stock,
        );

        // Cost estimate using latest invoice price
        const latestCost = await this.prisma.ingredientCost.findFirst({
          where: { ingredientId: ingredient.id, locationId },
          orderBy: { purchaseDate: 'desc' },
        });
        const estimatedCost = latestCost
          ? parseFloat((suggestedQty * latestCost.unitCost).toFixed(4))
          : null;

        const parLevelEstimate = triggerThreshold * dailyRate;

        const reason = [
          `${windowDays}-day avg: ${dailyRate.toFixed(3)} ${ingredient.unit}/day.`,
          `Est. stock: ${stock.toFixed(2)} ${ingredient.unit} (${daysRemaining.toFixed(1)} days remaining).`,
          `Supplier: ${supplier.name} — ${leadTimeDays}d lead time × ${safetyFactor} safety factor = ${triggerThreshold.toFixed(1)}d threshold.`,
          `Suggested order: ${suggestedQty.toFixed(2)} ${ingredient.unit}`,
          estimatedCost ? `(est. $${estimatedCost.toFixed(2)}).` : '(cost unknown — update ingredient price).',
        ].join(' ');

        suggestionItemInputs.push({
          ingredientId: ingredient.id,
          supplierId: supplier.id,
          urgency,
          suggestedQty: parseFloat(suggestedQty.toFixed(4)),
          estimatedCost,
          currentStockEstimate: parseFloat(stock.toFixed(4)),
          parLevelEstimate: parseFloat(parLevelEstimate.toFixed(4)),
          daysUntilStockout: parseFloat(daysRemaining.toFixed(2)),
          reason,
        });
      } catch (err) {
        this.logger.warn(`Skipping ingredient ${ingredient.id}: ${err}`);
      }
    }

    if (suggestionItemInputs.length === 0) {
      this.logger.log('No reorder items generated — all stock is healthy');
      return;
    }

    // Create suggestion with all items in one transaction
    const suggestion = await this.prisma.reorderSuggestion.create({
      data: {
        locationId,
        organizationId,
        generatedBy: 'system',
        status: 'PENDING',
        triggerType,
        triggerSourceId: triggerSourceId ?? null,
        windowDays,
        items: {
          create: suggestionItemInputs,
        },
      },
      include: { items: true },
    });

    const urgentCount = suggestion.items.filter(
      (i) => i.urgency === 'ORDER_TODAY',
    ).length;

    this.logger.log(
      `Suggestion ${suggestion.id} created: ${suggestion.items.length} items, ${urgentCount} urgent`,
    );

    const payload: ReorderSuggestionGeneratedPayload = {
      suggestionId: suggestion.id,
      locationId,
      organizationId,
      urgentItemCount: urgentCount,
    };
    this.eventEmitter.emit(Events.REORDER_SUGGESTION_GENERATED, payload);
  }

  // ─── stock and consumption calculation ──────────────────────────────────────

  private async calculateStockAndRate(
    ingredientId: string,
    ingredientUnit: string,
    locationId: string,
    organizationId: number,
    windowDays: number,
    chainQty?: number | null,
  ): Promise<{ stock: number; dailyRate: number }> {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - windowDays);

    let baselineQty: number;
    let baselineUnit: string;
    let baselineDate: Date;

    if (chainQty !== null && chainQty !== undefined) {
      baselineQty = chainQty;
      baselineUnit = ingredientUnit;
      baselineDate = now;
    } else {
      const snapshot = await this.prisma.inventorySnapshot.findFirst({
        where: { locationId, organizationId, snappedAt: { lte: now } },
        orderBy: { snappedAt: 'desc' },
        include: { items: { where: { ingredientId } } },
      });

      baselineQty = snapshot?.items[0]?.quantity ?? 0;
      baselineUnit = snapshot?.items[0]?.unit ?? ingredientUnit;
      baselineDate = snapshot?.snappedAt ?? new Date(0);
    }

    // Convert baseline to ingredient buy unit if needed
    const baselineInBuyUnit =
      convertToIngredientUnit(baselineQty, baselineUnit, ingredientUnit) ??
      baselineQty;

    // 2. Sum received orders since snapshot
    const receivedItems = await this.prisma.supplierOrderItem.findMany({
      where: {
        ingredientId,
        order: {
          locationId,
          organizationId,
          status: 'RECEIVED',
          receivedAt: { gte: baselineDate, lte: now },
        },
      },
    });

    const receivedQty = receivedItems.reduce((sum, item) => {
      const qty = item.qtyReceived ?? item.qtyOrdered;
      const converted =
        convertToIngredientUnit(qty, item.unit, ingredientUnit) ?? qty;
      return sum + converted;
    }, 0);

    // 3. Theoretical consumption from sales since snapshot
    const recipeIngredients = await this.prisma.recipeIngredient.findMany({
      where: { ingredientId },
    });

    const recipeIds = recipeIngredients.map((ri) => ri.recipeId);
    let consumedTotal = 0;
    let consumedInWindow = 0;

    if (recipeIds.length > 0) {
      const salesSinceSnapshot = await this.prisma.salesReportItem.findMany({
        where: {
          matchedRecipeId: { in: recipeIds },
          matchConfidence: { gte: 0.7 },
          salesReport: {
            locationId,
            organizationId,
            reportDate: { gte: baselineDate, lte: now },
          },
        },
      });

      const salesInWindow = await this.prisma.salesReportItem.findMany({
        where: {
          matchedRecipeId: { in: recipeIds },
          matchConfidence: { gte: 0.7 },
          salesReport: {
            locationId,
            organizationId,
            reportDate: { gte: windowStart, lte: now },
          },
        },
      });

      const calcConsumed = (items: typeof salesSinceSnapshot) =>
        items.reduce((sum, saleItem) => {
          const ri = recipeIngredients.find(
            (r) => r.recipeId === saleItem.matchedRecipeId,
          );
          if (!ri) return sum;
          const qty =
            convertToIngredientUnit(ri.quantity, ri.useUnit, ingredientUnit) ??
            ri.quantity;
          return sum + qty * saleItem.qtySold;
        }, 0);

      consumedTotal = calcConsumed(salesSinceSnapshot);
      consumedInWindow = calcConsumed(salesInWindow);
    }

    const stock = Math.max(
      0,
      baselineInBuyUnit + receivedQty - consumedTotal,
    );
    const dailyRate = consumedInWindow / windowDays;

    return { stock, dailyRate };
  }
}
