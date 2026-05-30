// src/events/event-types.ts
// All cross-module event names defined in one place.
// Modules emit and listen to these — they never call each other directly.

export const Events = {
  // Sales ingestion pipeline
  SALES_REPORT_IMPORTED:   'sales.report.imported',    // CSV uploaded, raw data saved
  SALES_REPORT_MATCHED:    'sales.report.matched',     // AI matching complete
  SALES_ITEMS_UNMATCHED:   'sales.items.unmatched',    // items need manual review

  // Supplier orders
  SUPPLIER_ORDER_RECEIVED: 'supplier.order.received',  // order marked as received

  // Reorder suggestions
  REORDER_SUGGESTION_GENERATED: 'reorder.suggestion.generated',

  // Catalog changes that affect downstream calculations
  INGREDIENT_COST_UPDATED: 'ingredient.cost.updated',  // price changed
  RECIPE_UPDATED:          'recipe.updated',            // recipe changed
} as const;

export type EventType = (typeof Events)[keyof typeof Events];
