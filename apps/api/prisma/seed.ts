// prisma/seed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Seeds the Baladi Coffee ingredient library into the database.
// Run once after the catalog migration:
//   npx prisma db seed
//
// Add to package.json in apps/api:
//   "prisma": { "seed": "ts-node -r tsconfig-paths/register prisma/seed.ts" }
//
// Costs marked "Manual — update" use placeholder values.
// Update them through the app UI or re-run with corrected values.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ingredient seed data — unit costs from real invoices where available
const INGREDIENTS = [
  // ── Amazon Fresh (real costs from invoices) ────────────────────────────────
  { name: 'Whole milk',                          unit: 'oz',     notes: 'Amazon Fresh' },
  { name: '2% reduced fat milk',                 unit: 'oz',     notes: 'Amazon Fresh' },
  { name: 'Oatly Full Fat Oat Milk',             unit: 'oz',     notes: 'Amazon Fresh' },
  { name: 'Heavy whipping cream',                unit: 'oz',     notes: 'Amazon Fresh' },
  { name: 'Almond milk (Almond Breeze)',         unit: 'oz',     notes: 'Amazon Fresh' },
  { name: 'Coconut milk (Silk)',                 unit: 'oz',     notes: 'Amazon Fresh' },
  { name: 'Strawberries (fresh)',                unit: 'oz',     notes: 'Amazon Fresh' },
  { name: 'Lemonade',                            unit: 'oz',     notes: 'Amazon Fresh' },
  // ── Espresso ──────────────────────────────────────────────────────────────
  { name: 'Espresso (double shot)',              unit: 'shot',   notes: 'Manual — update | 19g beans → 34ml per shot' },
  // ── Syrups ────────────────────────────────────────────────────────────────
  { name: 'Date syrup',                          unit: 'pump',   notes: 'Manual — update' },
  { name: 'Vanilla syrup',                       unit: 'pump',   notes: 'Manual — update' },
  { name: 'Cardamom syrup',                      unit: 'pump',   notes: 'Manual — update' },
  { name: 'Fig syrup',                           unit: 'pump',   notes: 'Manual — update' },
  { name: 'Lavender syrup',                      unit: 'pump',   notes: 'Manual — update' },
  { name: 'Brown sugar syrup',                   unit: 'pump',   notes: 'Manual — update' },
  { name: 'Caramel sauce',                       unit: 'pump',   notes: 'Manual — update' },
  { name: 'Mocha / chocolate sauce',             unit: 'pump',   notes: 'Manual — update' },
  { name: 'White chocolate sauce',               unit: 'pump',   notes: 'Manual — update' },
  { name: 'Sweetened condensed milk',            unit: 'oz',     notes: 'Manual — update' },
  { name: 'Matcha powder (ceremonial)',          unit: 'g',      notes: 'Manual — update | weigh 3.5g per drink' },
  { name: 'Butterfly pea flower tea bag',        unit: 'each',   notes: 'Manual — update' },
  { name: 'Masala chai concentrate',             unit: 'oz',     notes: 'Manual — update' },
  { name: 'Biscoff spread (Lotus)',              unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Pistachio cream (real pistachio)',    unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Ube paste / extract',                unit: 'dropper',notes: 'Manual — update' },
  { name: 'Honey',                               unit: 'pump',   notes: 'Manual — update' },
  { name: 'Agave syrup',                         unit: 'pump',   notes: 'Manual — update' },
  { name: 'Ginger syrup',                        unit: 'pump',   notes: 'Manual — update' },
  { name: 'Banana bread syrup',                  unit: 'pump',   notes: 'Manual — update' },
  { name: 'Pink Kashmiri chai powder',           unit: 'scoop',  notes: 'Manual — update' },
  { name: 'Mango puree',                         unit: 'oz',     notes: 'Manual — update' },
  { name: 'Vanilla frappe powder',               unit: 'scoop',  notes: 'Manual — update' },
  { name: 'Whipped cream',                       unit: 'oz',     notes: 'Manual — update' },
  { name: 'Dubai chocolate topping (kataifi)',   unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Arabic tea leaf',                     unit: 'scoop',  notes: 'Manual — update' },
  { name: 'Adeni tea leaf',                      unit: 'scoop',  notes: 'Manual — update' },
  { name: 'Cup + lid (12oz hot)',                unit: 'each',   notes: 'Manual — update' },
  { name: 'Cup + lid (16oz iced)',               unit: 'each',   notes: 'Wowbo' },
  { name: 'Cup + lid (24oz frappe)',             unit: 'each',   notes: 'Manual — update' },
  { name: 'Sealable can (17oz refresher)',       unit: 'each',   notes: 'Wowbo' },
  { name: 'Cinnamon powder',                     unit: 'g',      notes: 'Manual — update' },
  { name: 'Blackberry puree',                    unit: 'oz',     notes: 'Manual — update' },
  { name: 'London Fog (Earl Grey) concentrate', unit: 'oz',     notes: 'Manual — update' },
  { name: 'Salaam Cola',                         unit: 'each',   notes: 'Manual — update' },
  { name: 'Ginger ale can',                      unit: 'each',   notes: 'Manual — update' },
  { name: 'Pellegrino 500ml',                    unit: 'each',   notes: 'Manual — update' },
  { name: 'Rose water',                          unit: 'ml',     notes: 'Manual — update' },
  { name: 'Cardamom powder',                     unit: 'g',      notes: 'Manual — update' },
  { name: 'Brown sugar (dry)',                   unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Simple syrup',                        unit: 'pump',   notes: 'Manual — update' },
  { name: 'Cookie Butter syrup (Biscoff)',       unit: 'pump',   notes: 'Manual — update' },
  { name: 'Rose syrup',                          unit: 'pump',   notes: 'Manual — update' },
  { name: 'Pistachio syrup',                     unit: 'pump',   notes: 'Manual — update' },
  { name: 'Strawberry syrup',                    unit: 'pump',   notes: 'Manual — update' },
  { name: 'Blackberry syrup',                    unit: 'pump',   notes: 'Manual — update' },
  { name: 'Salted Caramel syrup',                unit: 'pump',   notes: 'Manual — update' },
  { name: 'Mocha powder (frappe)',               unit: 'scoop',  notes: 'Manual — update' },
  { name: 'Ginger Turmeric concentrate',         unit: 'oz',     notes: 'Manual — update' },
  { name: 'Peach Mango refresher juice',         unit: 'oz',     notes: 'Manual — update' },
  { name: 'Strawberry Acai refresher juice',     unit: 'oz',     notes: 'Manual — update' },
  { name: 'Sparkling Mojito can',                unit: 'each',   notes: 'Manual — update' },
  { name: 'Lemon Mint concentrate',              unit: 'oz',     notes: 'Manual — update' },
  { name: 'Blue Butterfly Pea Powder',           unit: 'tsp',    notes: 'Manual — update' },
  { name: 'Masala Chai Powder',                  unit: 'tsp',    notes: 'Manual — update' },
  { name: 'Evaporated milk',                     unit: 'oz',     notes: 'Manual — update' },
  { name: 'Cloves (whole)',                      unit: 'each',   notes: 'Manual — update' },
  { name: 'Nutmeg',                              unit: 'g',      notes: 'Manual — update' },
  { name: 'Adeni tea leaf (scoop)',              unit: 'scoop',  notes: 'Manual — update' },
  { name: 'Turkish Coffee Powder (Al-Ameed)',    unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Qahwa Sada Powder (Al-Ameed green)', unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Orange Blossom water',                unit: 'ml',     notes: 'Manual — update' },
  { name: 'Ground black coffee (pour-over)',     unit: 'g',      notes: 'Manual — update' },
  { name: 'Coffee beans (espresso blend)',       unit: 'lb',     notes: 'Manual — update | 19g per double shot' },
  { name: 'Kunefa mix (fried)',                  unit: 'oz',     notes: 'Manual — update' },
  { name: 'Pistachio butter (tasty + texture)', unit: 'tbsp',   notes: 'Manual — update' },
  { name: 'Croissant (plain)',                   unit: 'each',   notes: 'Manual — update' },
  { name: 'Powder sugar',                        unit: 'g',      notes: 'Manual — update' },
  { name: 'Whipping cream (for cold foam)',      unit: 'oz',     notes: 'Amazon Fresh' },
];

// Real costs from Amazon Fresh invoices (to be seeded with actual values)
const REAL_COSTS: Record<string, { pkgSize: number; qtyBought: number; totalPaid: number; source: string }> = {
  'Whole milk':                  { pkgSize: 128, qtyBought: 10, totalPaid: 27.70,  source: 'Amazon Fresh' },
  '2% reduced fat milk':         { pkgSize: 128, qtyBought: 2,  totalPaid: 5.52,   source: 'Amazon Fresh' },
  'Oatly Full Fat Oat Milk':     { pkgSize: 64,  qtyBought: 30, totalPaid: 158.10, source: 'Amazon Fresh' },
  'Heavy whipping cream':        { pkgSize: 32,  qtyBought: 2,  totalPaid: 9.94,   source: 'Amazon Fresh' },
  'Almond milk (Almond Breeze)': { pkgSize: 64,  qtyBought: 4,  totalPaid: 18.68,  source: 'Amazon Fresh' },
  'Coconut milk (Silk)':         { pkgSize: 64,  qtyBought: 1,  totalPaid: 4.49,   source: 'Amazon Fresh' },
  'Strawberries (fresh)':        { pkgSize: 32,  qtyBought: 8,  totalPaid: 40.96,  source: 'Amazon Fresh' },
  'Lemonade':                    { pkgSize: 64,  qtyBought: 5,  totalPaid: 10.45,  source: 'Amazon Fresh' },
  // Wowbo packaging (from invoice)
  'Cup + lid (16oz iced)':       { pkgSize: 1, qtyBought: 20000, totalPaid: 20000 * 0.302, source: 'Wowbo' },
  'Sealable can (17oz refresher)':{ pkgSize: 1, qtyBought: 20000, totalPaid: 20000 * 0.285, source: 'Wowbo' },
};

async function main() {
  console.log('🌱 Seeding Baladi ingredient library…');

  // Get or assume first location
  const locations = await prisma.location.findMany({ orderBy: { createdAt: 'asc' }, take: 1 });
  const locationId = locations[0]?.id;
  if (!locationId) {
    console.error('❌ No locations found. Create a location first, then re-run this seed.');
    process.exit(1);
  }

  console.log(`  Using location: ${locations[0].name} (${locationId})`);

  let created = 0, skipped = 0, costed = 0;

  for (const ing of INGREDIENTS) {
    const existing = await prisma.ingredient.findFirst({
      where: { name: ing.name, organizationId: 1 },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const created_ing = await prisma.ingredient.create({
      data: {
        name:  ing.name,
        unit:  ing.unit,
        notes: ing.notes,
        organizationId: 1,
      },
    });

    // Seed real costs where available
    const realCost = REAL_COSTS[ing.name];
    if (realCost) {
      const unitCost = realCost.totalPaid / (realCost.pkgSize * realCost.qtyBought);
      await prisma.ingredientCost.create({
        data: {
          ingredientId: created_ing.id,
          locationId,
          pkgSize:      realCost.pkgSize,
          qtyBought:    realCost.qtyBought,
          totalPaid:    realCost.totalPaid,
          unitCost:     parseFloat(unitCost.toFixed(6)),
          purchaseDate: new Date('2026-02-01'),
          invoiceRef:   `seed-${realCost.source.toLowerCase().replace(/\s/g, '-')}`,
        },
      });
      costed++;
    }

    created++;
  }

  console.log(`  ✓ Created: ${created} ingredients`);
  console.log(`  → Already existed: ${skipped}`);
  console.log(`  → Seeded with real costs: ${costed}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Open the app → Menu & Costs → Ingredients');
  console.log('  2. Click "+ Cost" on any "Manual — update" ingredient');
  console.log('  3. Enter the purchase details from your invoice');
  console.log('  4. Go to Recipes and verify/update quantities');
  console.log('');
  console.log('🌱 Seed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
