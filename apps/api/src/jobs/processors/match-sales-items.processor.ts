// src/jobs/processors/match-sales-items.processor.ts
// ─────────────────────────────────────────────────────────────────────────────
// Runs after a sales report CSV is uploaded.
// Attempts to match each Toast item name to a recipe using 3 layers:
//
//   Layer 1: Exact alias match
//   Layer 2: Direct normalized recipe name match
//   Layer 3: Flag for manual review
//
// Every successful match is saved to SalesItemAlias so the item is
// recognized instantly on every future import.
// ─────────────────────────────────────────────────────────────────────────────

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Queues, MatchSalesItemsJobData } from '../queue-names';
import { Events } from '../../events/event-types';
import {
  SalesReportMatchedPayload,
  SalesItemsUnmatchedPayload,
} from '../../events/event-payloads.interface';

@Processor(Queues.MATCH_SALES_ITEMS)
export class MatchSalesItemsProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchSalesItemsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<MatchSalesItemsJobData>): Promise<void> {
    const { salesReportId, organizationId } = job.data;

    this.logger.log(`Matching sales report ${salesReportId}`);

    // Load unmatched items for this report
    const items = await this.prisma.salesReportItem.findMany({
      where: { salesReportId, matchedRecipeId: null },
    });

    if (items.length === 0) {
      this.logger.log('No unmatched items — skipping');
      return;
    }

    // Load all recipes for this org
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId, active: true },
      select: { id: true, name: true },
    });

    // Load existing aliases for instant lookup
    const aliases = await this.prisma.salesItemAlias.findMany({
      where: { organizationId },
    });
    const aliasMap = new Map(aliases.map((a) => [normalize(a.toastName), a.recipeId]));

    let matched = 0;
    const unmatched: string[] = [];

    type MatchResult = { itemId: string; toastName: string; recipeId: string; confidence: number };
    const matchResults: MatchResult[] = [];

    for (const item of items) {
      const result = await this.matchItem(item.itemName, aliasMap, recipes);
      if (result) {
        matchResults.push({ itemId: item.id, toastName: item.itemName, recipeId: result.recipeId, confidence: result.confidence });
        aliasMap.set(normalize(item.itemName), result.recipeId);
        matched++;
      } else {
        unmatched.push(item.itemName);
      }
    }

    if (matchResults.length > 0) {
      await this.prisma.$transaction([
        ...matchResults.map((r) =>
          this.prisma.salesReportItem.update({
            where: { id: r.itemId },
            data: { matchedRecipeId: r.recipeId, matchConfidence: r.confidence },
          }),
        ),
      ]);

      // Alias upserts: create new ones, skip existing (update: {} is a no-op)
      await this.prisma.$transaction(
        matchResults.map((r) =>
          this.prisma.salesItemAlias.upsert({
            where: { toastName_organizationId: { toastName: normalize(r.toastName), organizationId } },
            create: { toastName: normalize(r.toastName), recipeId: r.recipeId, organizationId },
            update: {},
          }),
        ),
      );
    }

    this.logger.log(
      `Report ${salesReportId}: ${matched} matched, ${unmatched.length} need review`,
    );

    // Load the report to get locationId for events
    const report = await this.prisma.salesReport.findUniqueOrThrow({
      where: { id: salesReportId },
      select: { locationId: true, organizationId: true },
    });

    const matchedPayload: SalesReportMatchedPayload = {
      salesReportId,
      locationId: report.locationId,
      organizationId,
      totalItems: items.length,
      matchedItems: matched,
      unmatchedItems: unmatched.length,
    };

    this.eventEmitter.emit(Events.SALES_REPORT_MATCHED, matchedPayload);

    if (unmatched.length > 0) {
      const unmatchedPayload: SalesItemsUnmatchedPayload = {
        salesReportId,
        locationId: report.locationId,
        organizationId,
        unmatchedNames: unmatched,
      };
      this.eventEmitter.emit(Events.SALES_ITEMS_UNMATCHED, unmatchedPayload);
    }
  }

  // ─── matching layers ────────────────────────────────────────────────────────

  private async matchItem(
    toastName: string,
    aliasMap: Map<string, string>,
    recipes: { id: string; name: string }[],
  ): Promise<{ recipeId: string; confidence: number } | null> {
    const normalized = normalize(toastName);

    // Layer 1: exact alias match
    const aliasMatch = aliasMap.get(normalized);
    if (aliasMatch) {
      return { recipeId: aliasMatch, confidence: 1.0 };
    }

    // Layer 2: direct name match (normalized)
    const directMatch = recipes.find((recipe) => normalize(recipe.name) === normalized);
    if (directMatch) {
      return { recipeId: directMatch.id, confidence: 1.0 };
    }

    // Layer 3: unmatched — needs manual review
    return null;
  }
}

// ─── string utilities ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

