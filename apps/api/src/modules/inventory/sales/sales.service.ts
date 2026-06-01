// src/modules/inventory/sales/sales.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Handles ingestion of Toast Product Mix CSV exports.
// Parses → saves raw → queues matching job → returns report id.
// Also handles manual item matching when admin resolves unmatched items.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Injectable, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Queues, MatchSalesItemsJobData, GenerateReorderJobData } from '../../../jobs/queue-names';
import { Events } from '../../../events/event-types';
import { ok, paginated } from '../../../shared/response.envelope';
import { PaginationDto } from '../../../shared/pagination.dto';
import { UserContext } from '../../../shared/interfaces';
import { ManualMatchDto } from './dto/manual-match.dto';

// Expected columns from Toast Product Mix "All Levels" sheet exported as CSV
const REQUIRED_COLS = ['Item, open item', 'Qty sold', 'Gross sales', 'Net sales'];

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(Queues.MATCH_SALES_ITEMS) private readonly matchQueue: Queue,
    @InjectQueue(Queues.GENERATE_REORDER)  private readonly reorderQueue: Queue,
  ) {}

  // ─── import CSV ────────────────────────────────────────────────────────────

  async importCsv(
    fileBuffer: Buffer,
    locationId: string,
    reportDate: string,
    user: UserContext,
  ) {
    const parentLocationId = await this.resolveParentLocationId(locationId);

    // Parse the CSV
    let rows: Record<string, string>[];
    try {
      rows = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException('Could not parse CSV. Ensure you uploaded the "All Levels" sheet exported from Toast Product Mix report.');
    }

    // Validate required columns exist
    const cols = Object.keys(rows[0] ?? {});
    for (const required of REQUIRED_COLS) {
      if (!cols.includes(required)) {
        throw new BadRequestException(
          `Missing column "${required}". Please upload the Toast Product Mix "All Levels" CSV.`,
        );
      }
    }

    // Determine period from data (use reportDate for both if no range available)
    const periodStart = new Date(reportDate);
    const periodEnd   = new Date(reportDate);
    periodEnd.setHours(23, 59, 59, 999);

    // Create the report record
    const report = await this.prisma.salesReport.create({
      data: {
        locationId: parentLocationId,
        organizationId: user.organizationId,
        reportDate: new Date(reportDate),
        periodStart,
        periodEnd,
        source: 'CSV',
        importedBy: user.sub,
        rawJson: rows as any, // store original rows for audit
        items: {
          create: rows
            .filter((row) => {
              const qty = parseInt(row['Qty sold'], 10);
              return !isNaN(qty) && qty > 0 && row['Item, open item']?.trim();
            })
            .map((row) => ({
              itemName:      row['Item, open item'].trim(),
              menuGroup:     row['Menu group']?.trim() || null,
              qtySold:       parseInt(row['Qty sold'], 10),
              grossSales:    parseFloat(row['Gross sales']?.replace(/[$,]/g, '') ?? '0'),
              netSales:      parseFloat(row['Net sales']?.replace(/[$,]/g, '') ?? '0'),
              discountAmount:parseFloat(row['Discount amount']?.replace(/[$,]/g, '') ?? '0'),
            })),
        },
      },
    });

    this.logger.log(
      `Sales report ${report.id} created for ${parentLocationId} on ${reportDate} — ${rows.length} items`,
    );

    // Emit event and queue matching job
    this.eventEmitter.emit(Events.SALES_REPORT_IMPORTED, {
      salesReportId: report.id,
      locationId: parentLocationId,
      organizationId: user.organizationId,
    });

    const matchJobData: MatchSalesItemsJobData = {
      salesReportId: report.id,
      organizationId: user.organizationId,
    };
    await this.matchQueue.add('match', matchJobData, { priority: 1 });

    return ok({
      reportId: report.id,
      itemCount: rows.length,
      status: 'processing',
      message: 'Report uploaded. Item matching is running in the background.',
    });
  }

  // ─── queries ──────────────────────────────────────────────────────────────

  async findAll(locationId: string, organizationId: number, pagination: PaginationDto) {
    const parentLocationId = await this.resolveParentLocationId(locationId);

    const [items, total] = await Promise.all([
      this.prisma.salesReport.findMany({
        where: { locationId: parentLocationId, organizationId },
        orderBy: { reportDate: 'desc' },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.salesReport.count({ where: { locationId: parentLocationId, organizationId } }),
    ]);
    return paginated(items, total, pagination.page, pagination.limit);
  }

  async getUnmatchedItems(salesReportId: string, organizationId: number) {
    const report = await this.prisma.salesReport.findFirst({
      where: { id: salesReportId, organizationId },
    });
    if (!report) throw new NotFoundException('Sales report not found');

    const items = await this.prisma.salesReportItem.findMany({
      where: { salesReportId, matchedRecipeId: null },
      orderBy: { qtySold: 'desc' },
    });

    // Include available recipes for the dropdown
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId, active: true },
      select: { id: true, name: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return ok({ unmatchedItems: items, availableRecipes: recipes });
  }

  // ─── manual matching ──────────────────────────────────────────────────────

  async manualMatch(
    salesReportItemId: string,
    dto: ManualMatchDto,
    user: UserContext,
  ) {
    const item = await this.prisma.salesReportItem.findUnique({
      where: { id: salesReportItemId },
      include: { salesReport: true },
    });

    if (!item || item.salesReport.organizationId !== user.organizationId) {
      throw new NotFoundException('Sales report item not found');
    }

    // Update the match
    await this.prisma.salesReportItem.update({
      where: { id: salesReportItemId },
      data: { matchedRecipeId: dto.recipeId, matchConfidence: 1.0 },
    });

    // Save to alias table so this is auto-matched forever after
    await this.prisma.salesItemAlias.upsert({
      where: {
        toastName_organizationId: {
          toastName: item.itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
          organizationId: user.organizationId,
        },
      },
      create: {
        toastName: item.itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
        recipeId: dto.recipeId,
        organizationId: user.organizationId,
      },
      update: { recipeId: dto.recipeId },
    });

    // Check if this report is now fully matched — if so, trigger reorder
    const remaining = await this.prisma.salesReportItem.count({
      where: { salesReportId: item.salesReportId, matchedRecipeId: null },
    });

    if (remaining === 0) {
      const reorderJobData: GenerateReorderJobData = {
        locationId: item.salesReport.locationId,
        organizationId: user.organizationId,
        triggerType: 'SALES_IMPORT',
        triggerSourceId: item.salesReportId,
      };
      await this.reorderQueue.add('generate', reorderJobData);
    }

    return ok({ matched: true, remainingUnmatched: remaining });
  }

  private async resolveParentLocationId(locationId: string): Promise<string> {
    let current = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, parentId: true },
    });

    if (!current) {
      return locationId;
    }

    const visited = new Set<string>();

    while (current.parentId) {
      if (visited.has(current.id)) {
        break;
      }
      visited.add(current.id);

      const parent = await this.prisma.location.findUnique({
        where: { id: current.parentId },
        select: { id: true, parentId: true },
      });

      if (!parent) {
        break;
      }

      current = parent;
    }

    return current.id;
  }
}
