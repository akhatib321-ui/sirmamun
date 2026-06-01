// src/modules/inventory/reorder/reorder.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Queues, GenerateReorderJobData } from '../../../jobs/queue-names';
import { ok, paginated } from '../../../shared/response.envelope';
import { PaginationDto } from '../../../shared/pagination.dto';
import { UserContext } from '../../../shared/interfaces';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';

@Injectable()
export class ReorderService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(Queues.GENERATE_REORDER) private readonly reorderQueue: Queue,
  ) {}

  // ─── generate (manual trigger) ─────────────────────────────────────────────

  async generate(
    locationId: string,
    user: UserContext,
    windowDays: number = 7,
  ) {
    const parentLocationId = await this.resolveParentLocationId(locationId);

    const jobData: GenerateReorderJobData = {
      locationId: parentLocationId,
      organizationId: user.organizationId,
      triggerType: 'MANUAL',
      windowDays,
    };

    const job = await this.reorderQueue.add('generate', jobData, { priority: 1 });

    return ok({
      jobId: job.id,
      status: 'queued',
      message: 'Reorder calculation is running. Check back in a few seconds.',
    });
  }

  // ─── queries ──────────────────────────────────────────────────────────────

  async findAll(
    locationId: string,
    organizationId: number,
    pagination: PaginationDto,
  ) {
    const parentLocationId = await this.resolveParentLocationId(locationId);

    const [items, total] = await Promise.all([
      this.prisma.reorderSuggestion.findMany({
        where: { locationId: parentLocationId, organizationId },
        orderBy: { generatedAt: 'desc' },
        include: {
          _count: { select: { items: true } },
          items: {
            where: { urgency: 'ORDER_TODAY' },
            select: { id: true },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.reorderSuggestion.count({ where: { locationId: parentLocationId, organizationId } }),
    ]);

    // Annotate each suggestion with urgent item count
    const annotated = items.map((s) => ({
      ...s,
      urgentCount: s.items.length,
      totalCount: s._count.items,
      items: undefined,
      _count: undefined,
    }));

    return paginated(annotated, total, pagination.page, pagination.limit);
  }

  async findOne(id: string, organizationId: number) {
    const suggestion = await this.prisma.reorderSuggestion.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true } },
            supplier:   { select: { id: true, name: true, leadTimeDays: true } },
          },
          orderBy: [
            // ORDER_TODAY first, then ORDER_THIS_WEEK, then PLAN_AHEAD
            { urgency: 'asc' },
            { daysUntilStockout: 'asc' },
          ],
        },
      },
    });

    if (!suggestion) throw new NotFoundException('Reorder suggestion not found');
    return ok(suggestion);
  }

  async getLatestPending(locationId: string, organizationId: number) {
    const parentLocationId = await this.resolveParentLocationId(locationId);

    const suggestion = await this.prisma.reorderSuggestion.findFirst({
      where: { locationId: parentLocationId, organizationId, status: 'PENDING' },
      orderBy: { generatedAt: 'desc' },
      include: {
        items: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true } },
            supplier:   { select: { id: true, name: true, type: true, leadTimeDays: true } },
          },
          orderBy: [{ urgency: 'asc' }, { daysUntilStockout: 'asc' }],
        },
      },
    });

    return ok(suggestion); // null if none pending — frontend handles this
  }

  // ─── mutations ────────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    dto: UpdateSuggestionDto,
    user: UserContext,
  ) {
    const suggestion = await this.prisma.reorderSuggestion.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!suggestion) throw new NotFoundException('Reorder suggestion not found');

    const updated = await this.prisma.reorderSuggestion.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
      },
    });

    return ok(updated);
  }

  // ─── stock summary (for dashboard banner) ─────────────────────────────────

  async getStockAlerts(locationId: string, organizationId: number) {
    const parentLocationId = await this.resolveParentLocationId(locationId);

    // Get the latest pending suggestion and count items by urgency
    const latest = await this.prisma.reorderSuggestion.findFirst({
      where: { locationId: parentLocationId, organizationId, status: 'PENDING' },
      orderBy: { generatedAt: 'desc' },
      include: {
        _count: { select: { items: true } },
        items: {
          select: { urgency: true },
        },
      },
    });

    if (!latest) return ok({ hasSuggestion: false });

    const urgencyCounts = latest.items.reduce(
      (acc, item) => {
        acc[item.urgency] = (acc[item.urgency] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return ok({
      hasSuggestion: true,
      suggestionId: latest.id,
      generatedAt: latest.generatedAt,
      orderToday: urgencyCounts['ORDER_TODAY'] ?? 0,
      orderThisWeek: urgencyCounts['ORDER_THIS_WEEK'] ?? 0,
      planAhead: urgencyCounts['PLAN_AHEAD'] ?? 0,
      total: latest._count.items,
    });
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
