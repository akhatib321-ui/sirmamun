// src/jobs/processors/match-sales-items.processor.ts
// ─────────────────────────────────────────────────────────────────────────────
// Runs after a sales report CSV is uploaded.
// Attempts to match each Toast item name to a recipe using 4 layers:
//
//   Layer 1: Exact alias match (instant, free — covers 95%+ after week 1)
//   Layer 2: Normalized fuzzy match (Levenshtein — covers ambiguous casing)
//   Layer 3: Claude AI match (optional — if ANTHROPIC_API_KEY is set)
//   Layer 4: Flag for manual review (admin resolves in UI)
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

const AUTO_MATCH_THRESHOLD = 0.80; // fuzzy matches above this are auto-accepted
const REVIEW_THRESHOLD     = 0.60; // below this → manual review (no Claude call)
const CLAUDE_MODEL         = 'claude-sonnet-4-20250514';

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

    // Load all recipes for this org (used in layers 2 and 3)
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

    for (const item of items) {
      const result = await this.matchItem(
        item.itemName,
        organizationId,
        aliasMap,
        recipes,
      );

      if (result) {
        await this.prisma.salesReportItem.update({
          where: { id: item.id },
          data: {
            matchedRecipeId: result.recipeId,
            matchConfidence: result.confidence,
          },
        });

        // Save to alias table if not already there
        if (result.confidence >= AUTO_MATCH_THRESHOLD) {
          await this.prisma.salesItemAlias.upsert({
            where: {
              toastName_organizationId: {
                toastName: normalize(item.itemName),
                organizationId,
              },
            },
            create: {
              toastName: normalize(item.itemName),
              recipeId: result.recipeId,
              organizationId,
            },
            update: {},
          });
          aliasMap.set(normalize(item.itemName), result.recipeId);
        }

        matched++;
      } else {
        unmatched.push(item.itemName);
      }
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
    organizationId: number,
    aliasMap: Map<string, string>,
    recipes: { id: string; name: string }[],
  ): Promise<{ recipeId: string; confidence: number } | null> {
    // Layer 1: exact alias match
    const aliasMatch = aliasMap.get(normalize(toastName));
    if (aliasMatch) {
      return { recipeId: aliasMatch, confidence: 1.0 };
    }

    // Layer 2: normalized fuzzy match
    let bestFuzzy = { recipeId: '', confidence: 0 };
    for (const recipe of recipes) {
      const score = similarity(toastName, recipe.name);
      if (score > bestFuzzy.confidence) {
        bestFuzzy = { recipeId: recipe.id, confidence: score };
      }
    }

    if (bestFuzzy.confidence >= AUTO_MATCH_THRESHOLD) {
      return bestFuzzy;
    }

    // Layer 3: Claude AI match (only if key is set and fuzzy confidence is
    // high enough to be worth asking Claude about)
    if (
      bestFuzzy.confidence >= REVIEW_THRESHOLD &&
      process.env.ANTHROPIC_API_KEY
    ) {
      const claudeResult = await this.matchWithClaude(toastName, recipes);
      if (claudeResult) return claudeResult;
    }

    // Layer 4: unmatched — needs manual review
    return null;
  }

  private async matchWithClaude(
    toastName: string,
    recipes: { id: string; name: string }[],
  ): Promise<{ recipeId: string; confidence: number } | null> {
    try {
      const recipeList = recipes
        .map((r, i) => `${i + 1}. [${r.id}] ${r.name}`)
        .join('\n');

      const prompt = [
        `A Toast POS report contains this item: "${toastName}"`,
        `Match it to the most likely recipe from this list, or say NONE if no match:`,
        recipeList,
        ``,
        `Respond with ONLY a JSON object: {"recipeId":"<id>","confidence":<0.0-1.0>,"reason":"<brief>"}`,
        `Use NONE as recipeId if no match. Confidence above 0.8 means very sure.`,
      ].join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as {
        recipeId: string;
        confidence: number;
      };

      if (!parsed.recipeId || parsed.recipeId === 'NONE') return null;
      if (parsed.confidence < AUTO_MATCH_THRESHOLD) return null;

      return { recipeId: parsed.recipeId, confidence: parsed.confidence };
    } catch (err) {
      this.logger.warn(`Claude match failed for "${toastName}": ${err}`);
      return null;
    }
  }
}

// ─── string utilities ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;

  const m = nb.length;
  const n = na.length;
  if (m === 0 || n === 0) return 0;

  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        nb[i - 1] === na[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }

  return 1 - dp[m][n] / Math.max(m, n);
}
