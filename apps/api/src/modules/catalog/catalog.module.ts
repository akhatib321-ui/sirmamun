// src/modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { IngredientsService } from './ingredients/ingredients.service';
import { IngredientsController } from './ingredients/ingredients.controller';
import { RecipesService } from './recipes/recipes.service';
import { RecipesController } from './recipes/recipes.controller';
import { CatalogImportService } from './catalog-import.service';
import { CatalogImportController } from './catalog-import.controller';

/**
 * Catalog module owns: Ingredient, IngredientCost, Recipe, RecipeIngredient.
 * No other module imports these entities directly — they call CatalogModule services.
 *
 * Exports both services so the Inventory module can read recipe/ingredient
 * data without crossing into the database layer directly.
 */
@Module({
  imports: [EventEmitterModule, MulterModule.register({})],
  providers: [IngredientsService, RecipesService, CatalogImportService],
  controllers: [IngredientsController, RecipesController, CatalogImportController],
  exports: [IngredientsService, RecipesService],
})
export class CatalogModule {}
