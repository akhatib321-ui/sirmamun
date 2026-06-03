// src/shared/uom.util.ts
// Unit of measure conversion engine.
// Single source of truth for all unit conversions across the platform.
// Matches the frontend calculator exactly (pump = 15ml, shot = double shot).

interface UomEntry {
  family: 'weight' | 'volume' | 'count';
  base: number; // multiplier to convert 1 unit → base unit (g or ml or each)
  label: string;
}

export const UOM_TABLE: Record<string, UomEntry> = {
  // ── Weight (base: grams) ──────────────────────────────────────────────────
  g:       { family: 'weight', base: 1,         label: 'Gram' },
  kg:      { family: 'weight', base: 1000,       label: 'Kilogram' },
  lb:      { family: 'weight', base: 453.592,   label: 'Pound' },
  oz_w:    { family: 'weight', base: 28.3495,   label: 'Ounce (weight)' },
  // ── Volume (base: ml) ────────────────────────────────────────────────────
  ml:      { family: 'volume', base: 1,          label: 'Millilitre' },
  l:       { family: 'volume', base: 1000,        label: 'Litre' },
  oz:      { family: 'volume', base: 29.5735,   label: 'Fluid ounce' },
  gal:     { family: 'volume', base: 3785.41,   label: 'Gallon (US)' },
  cup:     { family: 'volume', base: 236.588,   label: 'Cup (US)' },
  tbsp:    { family: 'volume', base: 14.7868,   label: 'Tablespoon' },
  tsp:     { family: 'volume', base: 4.92892,   label: 'Teaspoon' },
  pump:    { family: 'volume', base: 15,         label: 'Pump (15 ml)' },
  // ── Count (base: each) ───────────────────────────────────────────────────
  each:    { family: 'count', base: 1,           label: 'Each / unit' },
  shot:    { family: 'count', base: 1,           label: 'Double shot (19g → 34ml)' },
  scoop:   { family: 'count', base: 1,           label: 'Scoop' },
  dropper: { family: 'count', base: 1,           label: 'Dropper' },
};

/**
 * Convert a quantity from one unit to another.
 * Returns null if units are incompatible (different families).
 *
 * @example convertUnits(5, 'lb', 'g') → 2267.96
 * @example convertUnits(1, 'oz', 'ml') → 29.5735
 * @example convertUnits(2, 'pump', 'oz') → 1.0144 (2 pumps = 30ml = ~1.01oz)
 * @example convertUnits(1, 'lb', 'ml') → null (weight ≠ volume)
 */
export function convertUnits(
  qty: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (fromUnit === toUnit) return qty;

  const from = UOM_TABLE[fromUnit];
  const to = UOM_TABLE[toUnit];

  if (!from || !to) return null;
  if (from.family !== to.family) return null;

  const inBase = qty * from.base;
  return inBase / to.base;
}

/**
 * Convert a recipe ingredient quantity (in useUnit) to the ingredient's
 * buy unit for consumption calculation.
 *
 * @example convertToIngredientUnit(19, 'g', 'lb') → 0.04189 lb
 */
export function convertToIngredientUnit(
  qty: number,
  useUnit: string,
  buyUnit: string,
): number | null {
  return convertUnits(qty, useUnit, buyUnit);
}

/**
 * Whether two units are compatible (can be converted between each other).
 */
export function unitsCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const ua = UOM_TABLE[a];
  const ub = UOM_TABLE[b];
  return !!ua && !!ub && ua.family === ub.family;
}
