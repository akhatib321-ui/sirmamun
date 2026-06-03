import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ok } from '../../shared/response.envelope';
import { UOM_TABLE, convertUnits } from '../../shared/uom.util';

type UnitFamily = 'weight' | 'volume' | 'count';
type LegacyRow = Record<string, unknown>;

export interface ChainStep {
  qty: number;
  unit: string;
  note: string;
}

export interface ChainResult {
  linkedItemId: string;
  linkedItemName: string;
  physicalQty: number;
  physicalUnit: string;
  resolvedQty: number | null;
  resolvedUnit: string;
  chain: ChainStep[];
  isComplete: boolean;
  warning: string | null;
}

const ALT_ENABLED_FIELDS = [
  'altUnitEnabled',
  'enableAltUnitConversion',
  'alt_unit_enabled',
  'enable_alt_unit_conversion',
];
const ALT_UNIT_FIELDS = ['altUnit', 'alt_unit'];
const ALT_FACTOR_FIELDS = ['conversionFactor', 'conversion_factor'];
const ALT_NOTE_FIELDS = ['conversionNote', 'conversion_note'];
const ITEM_NAME_FIELDS = ['name', 'description', 'desc'];
const ITEM_UNIT_FIELDS = ['uom', 'unit'];
const STOCK_QTY_FIELDS = ['qty', 'quantity'];

function baseUnitForFamily(family: UnitFamily): string {
  if (family === 'volume') return 'ml';
  if (family === 'weight') return 'g';
  return 'each';
}

function pickString(row: LegacyRow, fields: string[]): string | null {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickNumber(row: LegacyRow, fields: string[]): number | null {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function pickBoolean(row: LegacyRow, fields: string[]): boolean {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
    }
  }

  return false;
}

function normalizeUnit(value: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

@Injectable()
export class StockChainService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockItems() {
    const items = await this.prisma.$queryRaw<LegacyRow[]>`
      SELECT *
      FROM "items"
      ORDER BY "name" ASC
    `;

    return ok(
      items.map((item) => ({
        id: String(item.id),
        name: pickString(item, ITEM_NAME_FIELDS) ?? String(item.id),
        supplier: typeof item.supplier === 'string' ? item.supplier : null,
        unit: pickString(item, ITEM_UNIT_FIELDS),
        altUnit: pickString(item, ALT_UNIT_FIELDS),
        conversionFactor: pickNumber(item, ALT_FACTOR_FIELDS),
      })),
    );
  }

  async linkIngredient(ingredientId: string, stockItemId: string | null, organizationId: number) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, organizationId },
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    if (stockItemId) {
      const item = await this.findLegacyItem(stockItemId);
      if (!item) {
        throw new NotFoundException('Stock item not found');
      }
    }

    await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: { stockItemId },
    });

    if (!stockItemId) {
      return ok({ linked: false });
    }

    const chain = await this.resolveChain(ingredientId, null, organizationId);
    return ok({ linked: true, chain: chain.data });
  }

  async resolveChain(
    ingredientId: string,
    locationId: string | null,
    organizationId: number,
    stockItemId?: string | null,
  ) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, organizationId },
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const effectiveStockItemId = stockItemId ?? ingredient.stockItemId ?? null;

    if (!effectiveStockItemId) {
      return ok<ChainResult>({
        linkedItemId: '',
        linkedItemName: '',
        physicalQty: 0,
        physicalUnit: '',
        resolvedQty: null,
        resolvedUnit: ingredient.unit,
        chain: [],
        isComplete: false,
        warning: 'No stock item linked',
      });
    }

    const item = await this.findLegacyItem(effectiveStockItemId);
    if (!item) {
      return ok<ChainResult>({
        linkedItemId: effectiveStockItemId,
        linkedItemName: 'Item not found',
        physicalQty: 0,
        physicalUnit: '',
        resolvedQty: null,
        resolvedUnit: ingredient.unit,
        chain: [],
        isComplete: false,
        warning: `Stock item ${effectiveStockItemId} not found in inventory`,
      });
    }

    let stockRows = await this.findLegacyStockRows(effectiveStockItemId, locationId);
    let usedAllLocationsFallback = false;
    if (locationId && stockRows.length === 0) {
      const allLocationRows = await this.findLegacyStockRows(effectiveStockItemId, null);
      if (allLocationRows.length > 0) {
        stockRows = allLocationRows;
        usedAllLocationsFallback = true;
      }
    }

    const physicalQty = stockRows.reduce((sum, row) => sum + (pickNumber(row, STOCK_QTY_FIELDS) ?? 0), 0);
    const physicalUnit = pickString(item, ITEM_UNIT_FIELDS) ?? 'unit';
    const chain: ChainStep[] = [
      {
        qty: physicalQty,
        unit: physicalUnit,
        note: usedAllLocationsFallback
          ? 'No stock rows for selected location; showing SirMamun stock across all locations'
          : locationId
            ? 'Physical stock count from SirMamun for this location'
            : 'Physical stock count from SirMamun across all locations',
      },
    ];

    let workingQty = physicalQty;
    let workingUnit = normalizeUnit(physicalUnit) ?? 'unit';

    const altEnabled = pickBoolean(item, ALT_ENABLED_FIELDS);
    const altUnit = pickString(item, ALT_UNIT_FIELDS);
    const conversionFactor = pickNumber(item, ALT_FACTOR_FIELDS);
    if (altEnabled && altUnit && conversionFactor) {
      workingQty *= conversionFactor;
      workingUnit = normalizeUnit(altUnit) ?? workingUnit;
      chain.push({
        qty: workingQty,
        unit: altUnit,
        note:
          pickString(item, ALT_NOTE_FIELDS) ??
          `1 ${physicalUnit} = ${conversionFactor} ${altUnit}`,
      });
    }

    const builtInUnit = UOM_TABLE[workingUnit];
    const purchaseToBaseRaw = (ingredient as any).purchaseToBase;
    const purchaseUnitRaw = (ingredient as any).purchaseUnit;
    const purchaseToBase =
      typeof purchaseToBaseRaw === 'number'
        ? purchaseToBaseRaw
        : typeof purchaseToBaseRaw === 'string'
          ? Number.parseFloat(purchaseToBaseRaw)
          : null;
    const purchaseUnit =
      typeof purchaseUnitRaw === 'string' && purchaseUnitRaw.trim().length
        ? purchaseUnitRaw.trim()
        : null;
    let baseQty = workingQty;
    let baseUnit = workingUnit;

    if (builtInUnit) {
      baseQty = workingQty * builtInUnit.base;
      baseUnit = baseUnitForFamily(builtInUnit.family as UnitFamily);
    } else if (purchaseToBase && Number.isFinite(purchaseToBase) && purchaseToBase > 0) {
      const recipeEntry = UOM_TABLE[ingredient.unit];
      const family = (recipeEntry?.family as UnitFamily | undefined) ?? 'volume';
      baseQty = workingQty * purchaseToBase;
      baseUnit = baseUnitForFamily(family);
      chain.push({
        qty: parseFloat(baseQty.toFixed(4)),
        unit: baseUnit,
        note: `${purchaseUnit ?? workingUnit}: 1 ${workingUnit} = ${purchaseToBase} ${baseUnit}`,
      });
    } else {
      const customUnit = await this.prisma.customUnit.findFirst({
        where: { name: workingUnit, organizationId },
      });

      if (!customUnit) {
        return ok<ChainResult>({
          linkedItemId: effectiveStockItemId,
          linkedItemName: pickString(item, ITEM_NAME_FIELDS) ?? effectiveStockItemId,
          physicalQty,
          physicalUnit,
          resolvedQty: null,
          resolvedUnit: ingredient.unit,
          chain,
          isComplete: false,
          warning: `Unit "${workingUnit}" has no conversion. Set purchase chain on this ingredient or add it to custom units.`,
        });
      }

      baseQty = workingQty * customUnit.baseValue;
      baseUnit = baseUnitForFamily(customUnit.family as UnitFamily);
      chain.push({
        qty: parseFloat(baseQty.toFixed(4)),
        unit: baseUnit,
        note: `${customUnit.label}: 1 ${customUnit.name} = ${customUnit.baseValue} ${baseUnit}`,
      });
    }

    const resolvedQty = convertUnits(baseQty, baseUnit, ingredient.unit);
    if (resolvedQty === null) {
      return ok<ChainResult>({
        linkedItemId: effectiveStockItemId,
        linkedItemName: pickString(item, ITEM_NAME_FIELDS) ?? effectiveStockItemId,
        physicalQty,
        physicalUnit,
        resolvedQty: null,
        resolvedUnit: ingredient.unit,
        chain,
        isComplete: false,
        warning: `Cannot convert ${baseUnit} to ${ingredient.unit}.`,
      });
    }

    chain.push({
      qty: parseFloat(resolvedQty.toFixed(4)),
      unit: ingredient.unit,
      note: 'Catalog unit used by recipe calculations',
    });

    return ok<ChainResult>({
      linkedItemId: effectiveStockItemId,
      linkedItemName: pickString(item, ITEM_NAME_FIELDS) ?? effectiveStockItemId,
      physicalQty,
      physicalUnit,
      resolvedQty: parseFloat(resolvedQty.toFixed(4)),
      resolvedUnit: ingredient.unit,
      chain,
      isComplete: true,
      warning: null,
    });
  }

  async resolveAllForLocation(locationId: string, organizationId: number) {
    const linkedIngredients = await this.prisma.ingredient.findMany({
      where: { organizationId, stockItemId: { not: null } },
      select: { id: true },
    });

    const results: Record<string, number | null> = {};
    for (const ingredient of linkedIngredients) {
      try {
        const chain = await this.resolveChain(ingredient.id, locationId, organizationId);
        results[ingredient.id] = chain.data.resolvedQty;
      } catch {
        results[ingredient.id] = null;
      }
    }

    return results;
  }

  private async findLegacyItem(id: string) {
    const rows = await this.prisma.$queryRaw<LegacyRow[]>`
      SELECT *
      FROM "items"
      WHERE "id"::text = ${id}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  private async findLegacyStockRows(itemId: string, locationId: string | null) {
    if (locationId) {
      return this.prisma.$queryRaw<LegacyRow[]>`
        SELECT *
        FROM "stock"
        WHERE "iid" = ${itemId}
          AND "lid" = ${locationId}
      `;
    }

    return this.prisma.$queryRaw<LegacyRow[]>`
      SELECT *
      FROM "stock"
      WHERE "iid" = ${itemId}
    `;
  }
}