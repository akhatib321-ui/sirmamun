import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { parse as parseCsv } from 'csv-parse/sync';
import { PrismaService } from '../../core/prisma/prisma.service';
import { UserContext } from '../../shared/interfaces';
import { ok } from '../../shared/response.envelope';

interface ImportIngredient {
  name: string;
  unit: string;
  notes?: string;
  costs?: Array<{
    pkgSize: number;
    qtyBought: number;
    totalPaid: number;
    purchaseDate?: string;
    source?: string;
  }>;
}

interface ImportRecipeIngredient {
  ingredientName: string;
  quantity: number;
  useUnit: string;
}

interface ImportRecipe {
  name: string;
  category: string;
  sellPrice: number;
  ingredients: ImportRecipeIngredient[];
}

interface ImportPayload {
  version: number;
  exportedAt?: string;
  ingredients: ImportIngredient[];
  recipes: ImportRecipe[];
}

@Injectable()
export class CatalogImportService {
  private readonly logger = new Logger(CatalogImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importJson(payload: ImportPayload, locationId: string, user: UserContext) {
    const { ingredients = [], recipes = [] } = payload;

    if (!ingredients.length && !recipes.length) {
      throw new BadRequestException('Import file contains no ingredients or recipes.');
    }

    const stats = {
      ingredientsCreated: 0,
      ingredientsUpdated: 0,
      costsAdded: 0,
      recipesCreated: 0,
      recipesUpdated: 0,
      recipeIngsLinked: 0,
      errors: [] as string[],
    };

    const ingNameToId = new Map<string, string>();

    for (const ing of ingredients) {
      try {
        const existing = await this.prisma.ingredient.findFirst({
          where: { name: ing.name, organizationId: user.organizationId },
        });

        let ingId: string;

        if (existing) {
          ingId = existing.id;
          await this.prisma.ingredient.update({
            where: { id: ingId },
            data: { unit: ing.unit, notes: ing.notes ?? existing.notes },
          });
          stats.ingredientsUpdated++;
        } else {
          const created = await this.prisma.ingredient.create({
            data: {
              name: ing.name,
              unit: ing.unit,
              notes: ing.notes,
              organizationId: user.organizationId,
            },
          });
          ingId = created.id;
          stats.ingredientsCreated++;
        }

        ingNameToId.set(ing.name.toLowerCase().trim(), ingId);

        if (ing.costs?.length) {
          for (const cost of ing.costs) {
            if (!cost.pkgSize || !cost.totalPaid) continue;
            const unitCost = cost.totalPaid / (cost.pkgSize * (cost.qtyBought || 1));
            await this.prisma.ingredientCost.create({
              data: {
                ingredientId: ingId,
                locationId,
                buyUnit: ing.unit,
                pkgSize: cost.pkgSize,
                qtyBought: cost.qtyBought || 1,
                totalPaid: cost.totalPaid,
                unitCost: parseFloat(unitCost.toFixed(6)),
                purchaseDate: cost.purchaseDate ? new Date(cost.purchaseDate) : new Date(),
                invoiceRef: cost.source ? `import-${cost.source}` : 'bulk-import',
              },
            });
            stats.costsAdded++;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Ingredient "${ing.name}": ${message}`);
      }
    }

    for (const rec of recipes) {
      try {
        const existing = await this.prisma.recipe.findFirst({
          where: {
            name: rec.name,
            locationId: null,
            organizationId: user.organizationId,
          },
        });

        let recipeId: string;

        if (existing) {
          await this.prisma.recipe.update({
            where: { id: existing.id },
            data: { category: rec.category, sellPrice: rec.sellPrice ?? existing.sellPrice },
          });
          recipeId = existing.id;
          stats.recipesUpdated++;
        } else {
          const created = await this.prisma.recipe.create({
            data: {
              name: rec.name,
              category: rec.category,
              sellPrice: rec.sellPrice ?? 0,
              locationId: null,
              organizationId: user.organizationId,
            },
          });
          recipeId = created.id;
          stats.recipesCreated++;
        }

        for (const ri of rec.ingredients ?? []) {
          const ingId = ingNameToId.get(ri.ingredientName?.toLowerCase().trim());
          if (!ingId) {
            stats.errors.push(
              `Recipe "${rec.name}": ingredient "${ri.ingredientName}" not found - add it to ingredients first`,
            );
            continue;
          }

          await this.prisma.recipeIngredient.upsert({
            where: { recipeId_ingredientId: { recipeId, ingredientId: ingId } },
            create: {
              recipeId,
              ingredientId: ingId,
              quantity: ri.quantity,
              useUnit: ri.useUnit,
            },
            update: {
              quantity: ri.quantity,
              useUnit: ri.useUnit,
            },
          });
          stats.recipeIngsLinked++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Recipe "${rec.name}": ${message}`);
      }
    }

    this.logger.log(
      `Import complete - ${stats.ingredientsCreated} ingredients, ${stats.recipesCreated} recipes, ${stats.recipeIngsLinked} links`,
    );

    return ok({
      summary: {
        ingredients: { created: stats.ingredientsCreated, updated: stats.ingredientsUpdated },
        costs: { added: stats.costsAdded },
        recipes: { created: stats.recipesCreated, updated: stats.recipesUpdated },
        links: { created: stats.recipeIngsLinked },
      },
      errors: stats.errors,
      hasErrors: stats.errors.length > 0,
    });
  }

  async importIngredientsCsv(fileBuffer: Buffer, locationId: string, user: UserContext) {
    let rows: Record<string, string>[];
    try {
      rows = parseCsv(fileBuffer, {
        columns: (header: string[]) =>
          header.map((h) => h.toLowerCase().trim().replace(/\s+/g, '_')),
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException(
        'Could not parse CSV. Ensure it uses columns: name, unit, pkg_size, qty_bought, total_paid, purchase_date, source, notes',
      );
    }

    if (!rows.length) throw new BadRequestException('CSV file is empty.');

    const requiredCols = ['name', 'unit'];
    const firstRow = rows[0];
    for (const col of requiredCols) {
      if (!(col in firstRow)) {
        throw new BadRequestException(`Missing required column: "${col}"`);
      }
    }

    const stats = {
      created: 0,
      updated: 0,
      costsAdded: 0,
      errors: [] as string[],
      skipped: 0,
    };

    for (const row of rows) {
      const name = row.name?.trim();
      const unit = row.unit?.trim();
      if (!name || !unit) {
        stats.skipped++;
        continue;
      }

      try {
        const existing = await this.prisma.ingredient.findFirst({
          where: { name, organizationId: user.organizationId },
        });

        let ingId: string;

        if (existing) {
          ingId = existing.id;
          if (existing.unit !== unit || (row.notes && existing.notes !== row.notes)) {
            await this.prisma.ingredient.update({
              where: { id: ingId },
              data: { unit, notes: row.notes || existing.notes },
            });
          }
          stats.updated++;
        } else {
          const created = await this.prisma.ingredient.create({
            data: { name, unit, notes: row.notes || null, organizationId: user.organizationId },
          });
          ingId = created.id;
          stats.created++;
        }

        const pkgSize = parseFloat(row.pkg_size);
        const qtyBought = parseInt(row.qty_bought || '1', 10);
        const totalPaid = parseFloat(row.total_paid);

        if (!isNaN(pkgSize) && !isNaN(totalPaid) && pkgSize > 0 && totalPaid > 0) {
          const unitCost = totalPaid / (pkgSize * qtyBought);
          await this.prisma.ingredientCost.create({
            data: {
              ingredientId: ingId,
              locationId,
              buyUnit: unit,
              pkgSize,
              qtyBought,
              totalPaid,
              unitCost: parseFloat(unitCost.toFixed(6)),
              purchaseDate: row.purchase_date ? new Date(row.purchase_date) : new Date(),
              invoiceRef: row.source
                ? `csv-import-${row.source.toLowerCase().replace(/\s+/g, '-')}`
                : 'csv-import',
            },
          });
          stats.costsAdded++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Row "${name}": ${message}`);
      }
    }

    return ok({
      summary: {
        created: stats.created,
        updated: stats.updated,
        costsAdded: stats.costsAdded,
        skipped: stats.skipped,
      },
      errors: stats.errors,
      hasErrors: stats.errors.length > 0,
    });
  }
}
