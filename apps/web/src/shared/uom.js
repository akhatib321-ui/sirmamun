// src/shared/uom.js
// UOM conversion for the frontend — mirrors src/shared/uom.util.ts exactly.
// pump = 15ml, shot = double shot (19g beans → 34ml).

export const UOM_TABLE = {
  g:       { family: 'weight', base: 1,        label: 'Gram' },
  kg:      { family: 'weight', base: 1000,      label: 'Kilogram' },
  lb:      { family: 'weight', base: 453.592,   label: 'Pound' },
  oz_w:    { family: 'weight', base: 28.3495,   label: 'Ounce (weight)' },
  ml:      { family: 'volume', base: 1,         label: 'Millilitre' },
  l:       { family: 'volume', base: 1000,       label: 'Litre' },
  oz:      { family: 'volume', base: 29.5735,   label: 'Fluid ounce' },
  gal:     { family: 'volume', base: 3785.41,   label: 'Gallon (US)' },
  cup:     { family: 'volume', base: 236.588,   label: 'Cup (US)' },
  tbsp:    { family: 'volume', base: 14.7868,   label: 'Tablespoon' },
  tsp:     { family: 'volume', base: 4.92892,   label: 'Teaspoon' },
  pump:    { family: 'volume', base: 15,        label: 'Pump (15 ml)' },
  each:    { family: 'count',  base: 1,         label: 'Each / unit' },
  shot:    { family: 'count',  base: 1,         label: 'Double shot (19g → 34ml)' },
  scoop:   { family: 'count',  base: 1,         label: 'Scoop' },
  dropper: { family: 'count',  base: 1,         label: 'Dropper' },
};

export const ALL_UNITS = Object.keys(UOM_TABLE);

/** How many `toUnit` fit in 1 `fromUnit`. Returns null if incompatible. */
export function convert(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1;
  const from = UOM_TABLE[fromUnit];
  const to   = UOM_TABLE[toUnit];
  if (!from || !to || from.family !== to.family) return null;
  return from.base / to.base;
}

/** All units compatible with srcUnit (same family). */
export function compatibleUnits(srcUnit) {
  const family = UOM_TABLE[srcUnit]?.family;
  if (!family) return [srcUnit];
  return ALL_UNITS.filter(k => UOM_TABLE[k].family === family);
}

export function canConvert(a, b) {
  return a === b || convert(a, b) !== null;
}

/**
 * Cost per use-unit given an ingredient's latest cost record.
 * The API returns costs sorted by purchaseDate desc, so costs[0] is latest.
 */
export function cpuIn(ingredient, useUnit) {
  const latest = ingredient.costs?.[0];
  if (!latest) return 0;
  const base = latest.unitCost; // already computed server-side
  if (!useUnit || useUnit === ingredient.unit) return base;
  const factor = convert(ingredient.unit, useUnit);
  return factor ? base / factor : base;
}

/** Build a lookup map of ingredientId → ingredient for O(1) access. */
export function buildIngMap(ingredients) {
  return Object.fromEntries((ingredients ?? []).map(i => [i.id, i]));
}

/** Total COGS for a recipe given ingredient lookup map. */
export function cogsOf(recipe, ingMap) {
  return (recipe.ingredients ?? []).reduce((sum, ri) => {
    const ing = ingMap[ri.ingredientId];
    if (!ing) return sum;
    return sum + cpuIn(ing, ri.useUnit) * ri.quantity;
  }, 0);
}

/** Gross margin % for a recipe, or null if uncosted / no sell price. */
export function marginOf(recipe, ingMap) {
  if (!recipe.sellPrice || recipe.sellPrice <= 0) return null;
  if (!recipe.ingredients?.length) return null;
  const cogs = cogsOf(recipe, ingMap);
  return ((recipe.sellPrice - cogs) / recipe.sellPrice) * 100;
}

export function marginColor(pct) {
  if (pct === null) return '#9C8E82';
  if (pct >= 70) return '#1D7A3F';
  if (pct >= 50) return '#C59B00';
  return '#B03A2E';
}

export function marginBg(pct) {
  if (pct === null) return '#F3EEE8';
  if (pct >= 70) return '#E8F8EF';
  if (pct >= 50) return '#FEFCE8';
  return '#FDEDEC';
}
