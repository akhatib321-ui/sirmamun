import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StockChainService } from './stock-chain.service';
import { convertToIngredientUnit } from '../../shared/uom.util';
import { ok } from '../../shared/response.envelope';

type Urgency = 'ORDER_TODAY' | 'ORDER_THIS_WEEK' | 'PLAN_AHEAD' | 'HEALTHY';

type LocationRow = {
  id: string;
  name: string;
  parentId: string | null;
};

type StatusLocation = {
  locationId: string;
  locationName: string;
  stockOnHand: number;
  dailyUse: number;
  daysLeft: number | null;
  urgency: Urgency;
  hasPhysicalLink: boolean;
  linkedItemId: string | null;
};

type StatusItem = {
  id: string;
  name: string;
  buyUnit: string;
  recipeUnits: string[];
  recipeNames: string[];
  supplierName: string | null;
  costPerUnit: number | null;
  stockOnHand: number;
  dailyUse: number;
  daysLeft: number | null;
  urgency: Urgency;
  hasPhysicalLink: boolean;
  linkedItemId: string | null;
  locations: StatusLocation[];
};

@Injectable()
export class StockStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockChain: StockChainService,
  ) {}

  async getStatus(organizationId: number, windowDays = 7) {
    try {
      const parentLocations = await this.getParentLocations();
      const ingredients = await this.prisma.ingredient.findMany({
        where: { organizationId },
        include: {
          supplierLinks: {
            where: { preferred: true },
            include: { supplier: { select: { name: true } } },
            take: 1,
          },
          costs: {
            orderBy: { purchaseDate: 'desc' },
            take: 1,
            select: { unitCost: true, buyUnit: true },
          },
          recipeIngredients: {
            include: { recipe: { select: { name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      });

      if (!ingredients.length) {
        return ok({
          windowDays,
          generatedAt: new Date().toISOString(),
          locations: parentLocations.map((l) => ({ id: l.id, name: l.name })),
          items: [],
        });
      }

      const ingredientUnitById = new Map(ingredients.map((i) => [i.id, i.unit]));
      const recipeUsageByRecipeId = await this.buildRecipeUsageMap(ingredientUnitById);

      const usageByLocation = new Map<string, Map<string, number>>();
      const snapshotByLocation = new Map<string, Map<string, number>>();
      const chainByLocation = new Map<string, Record<string, number | null>>();

      for (const location of parentLocations) {
        try {
          usageByLocation.set(
            location.id,
            await this.calculateUsageForLocation(
              location.id,
              organizationId,
              windowDays,
              recipeUsageByRecipeId,
            ),
          );

          snapshotByLocation.set(
            location.id,
            await this.loadSnapshotEstimateMap(location.id, organizationId, ingredientUnitById),
          );

          chainByLocation.set(
            location.id,
            await this.stockChain.resolveAllForLocation(location.id, organizationId),
          );
        } catch {
          usageByLocation.set(location.id, new Map());
          snapshotByLocation.set(location.id, new Map());
          chainByLocation.set(location.id, {});
        }
      }

      const items: StatusItem[] = ingredients.map((ingredient) => {
      const recipeUnits = Array.from(
        new Set((ingredient.recipeIngredients ?? []).map((ri) => ri.useUnit).filter(Boolean)),
      );

      const recipeNames = Array.from(
        new Set((ingredient.recipeIngredients ?? []).map((ri) => ri.recipe?.name).filter(Boolean as any)),
      ).slice(0, 8) as string[];

      const locations: StatusLocation[] = parentLocations.map((location) => {
        const dailyUseRaw = usageByLocation.get(location.id)?.get(ingredient.id) ?? 0;
        const dailyUse = parseFloat((dailyUseRaw / windowDays).toFixed(4));

        const chainQty = chainByLocation.get(location.id)?.[ingredient.id] ?? null;
        const hasPhysicalLink = chainQty !== null && chainQty !== undefined;
        const estimateQty = snapshotByLocation.get(location.id)?.get(ingredient.id) ?? 0;
        const stockOnHand = parseFloat(((hasPhysicalLink ? chainQty : estimateQty) ?? 0).toFixed(4));

        const daysLeft = dailyUse > 0 ? stockOnHand / dailyUse : null;

        return {
          locationId: location.id,
          locationName: location.name,
          stockOnHand,
          dailyUse,
          daysLeft: daysLeft === null ? null : parseFloat(daysLeft.toFixed(2)),
          urgency: this.classifyUrgency(daysLeft),
          hasPhysicalLink,
          linkedItemId: ingredient.stockItemId ?? null,
        };
      });

      const stockOnHand = parseFloat(
        locations.reduce((sum, loc) => sum + loc.stockOnHand, 0).toFixed(4),
      );
      const dailyUse = parseFloat(
        locations.reduce((sum, loc) => sum + loc.dailyUse, 0).toFixed(4),
      );
      const daysLeft = dailyUse > 0 ? stockOnHand / dailyUse : null;
      const hasPhysicalLink = locations.some((loc) => loc.hasPhysicalLink);

      return {
        id: ingredient.id,
        name: ingredient.name,
        buyUnit: ingredient.costs[0]?.buyUnit ?? ingredient.unit,
        recipeUnits,
        recipeNames,
        supplierName: ingredient.supplierLinks[0]?.supplier?.name ?? null,
        costPerUnit: ingredient.costs[0]?.unitCost ?? null,
        stockOnHand,
        dailyUse,
        daysLeft: daysLeft === null ? null : parseFloat(daysLeft.toFixed(2)),
        urgency: this.classifyUrgency(daysLeft),
        hasPhysicalLink,
        linkedItemId: ingredient.stockItemId ?? null,
        locations,
      };
    });

      return ok({
        windowDays,
        generatedAt: new Date().toISOString(),
        locations: parentLocations.map((l) => ({ id: l.id, name: l.name })),
        items,
      });
    } catch {
      return ok({
        windowDays,
        generatedAt: new Date().toISOString(),
        locations: [],
        items: [],
      });
    }
  }

  async getSummary(organizationId: number, windowDays = 7) {
    const status = await this.getStatus(organizationId, windowDays);
    const items: StatusItem[] = status.data.items ?? [];

    const orderToday = items.filter((i) => i.urgency === 'ORDER_TODAY').length;
    const orderThisWeek = items.filter((i) => i.urgency === 'ORDER_THIS_WEEK').length;
    const planAhead = items.filter((i) => i.urgency === 'PLAN_AHEAD').length;
    const healthy = items.filter((i) => i.urgency === 'HEALTHY').length;

    return ok({
      orderToday,
      orderThisWeek,
      planAhead,
      healthy,
      total: items.length,
      generatedAt: status.data.generatedAt,
    });
  }

  private classifyUrgency(daysLeft: number | null): Urgency {
    if (daysLeft === null || !Number.isFinite(daysLeft)) return 'HEALTHY';
    if (daysLeft <= 3) return 'ORDER_TODAY';
    if (daysLeft <= 7) return 'ORDER_THIS_WEEK';
    if (daysLeft <= 21) return 'PLAN_AHEAD';
    return 'HEALTHY';
  }

  private async buildRecipeUsageMap(
    ingredientUnitById: Map<string, string>,
  ): Promise<Map<string, Array<{ ingredientId: string; qtyInBuyUnit: number }>>> {
    const recipeIngredients = await this.prisma.recipeIngredient.findMany({
      select: {
        recipeId: true,
        ingredientId: true,
        quantity: true,
        useUnit: true,
      },
    });

    const byRecipeId = new Map<string, Array<{ ingredientId: string; qtyInBuyUnit: number }>>();

    for (const ri of recipeIngredients) {
      const ingredientUnit = ingredientUnitById.get(ri.ingredientId);
      if (!ingredientUnit) continue;

      const qtyInBuyUnit =
        convertToIngredientUnit(ri.quantity, ri.useUnit, ingredientUnit) ?? ri.quantity;

      if (!byRecipeId.has(ri.recipeId)) {
        byRecipeId.set(ri.recipeId, []);
      }

      byRecipeId.get(ri.recipeId)?.push({
        ingredientId: ri.ingredientId,
        qtyInBuyUnit,
      });
    }

    return byRecipeId;
  }

  private async calculateUsageForLocation(
    locationId: string,
    organizationId: number,
    windowDays: number,
    recipeUsageByRecipeId: Map<string, Array<{ ingredientId: string; qtyInBuyUnit: number }>>,
  ) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - windowDays);

    const salesItems = await this.prisma.salesReportItem.findMany({
      where: {
        matchedRecipeId: { not: null },
        matchConfidence: { gte: 0.7 },
        salesReport: {
          locationId,
          organizationId,
          reportDate: { gte: start, lte: now },
        },
      },
      select: {
        matchedRecipeId: true,
        qtySold: true,
      },
    });

    const usage = new Map<string, number>();

    for (const sale of salesItems) {
      if (!sale.matchedRecipeId) continue;
      const recipeIngredients = recipeUsageByRecipeId.get(sale.matchedRecipeId) ?? [];
      for (const ri of recipeIngredients) {
        const prev = usage.get(ri.ingredientId) ?? 0;
        usage.set(ri.ingredientId, prev + ri.qtyInBuyUnit * sale.qtySold);
      }
    }

    return usage;
  }

  private async loadSnapshotEstimateMap(
    locationId: string,
    organizationId: number,
    ingredientUnitById: Map<string, string>,
  ) {
    const snapshot = await this.prisma.inventorySnapshot.findFirst({
      where: { locationId, organizationId },
      orderBy: { snappedAt: 'desc' },
      include: { items: true },
    });

    const map = new Map<string, number>();

    for (const item of snapshot?.items ?? []) {
      const ingredientUnit = ingredientUnitById.get(item.ingredientId);
      if (!ingredientUnit) continue;

      const qtyInBuyUnit =
        convertToIngredientUnit(item.quantity, item.unit, ingredientUnit) ?? item.quantity;

      map.set(item.ingredientId, qtyInBuyUnit);
    }

    return map;
  }

  private async getParentLocations() {
    const locations = await this.prisma.location.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, parentId: true },
    });

    return locations.filter((loc) => !loc.parentId).sort((a, b) => a.name.localeCompare(b.name)) as LocationRow[];
  }
}
