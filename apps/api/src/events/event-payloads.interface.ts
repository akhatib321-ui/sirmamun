// src/events/event-payloads.interface.ts
// Typed payloads for every event. Listeners use these types to stay safe.

export interface SalesReportImportedPayload {
  salesReportId: string;
  locationId: string;
  organizationId: number;
}

export interface SalesReportMatchedPayload {
  salesReportId: string;
  locationId: string;
  organizationId: number;
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
}

export interface SalesItemsUnmatchedPayload {
  salesReportId: string;
  locationId: string;
  organizationId: number;
  unmatchedNames: string[];
}

export interface SupplierOrderReceivedPayload {
  supplierOrderId: string;
  locationId: string;
  organizationId: number;
}

export interface ReorderSuggestionGeneratedPayload {
  suggestionId: string;
  locationId: string;
  organizationId: number;
  urgentItemCount: number;
}

export interface IngredientCostUpdatedPayload {
  ingredientId: string;
  locationId: string;
  organizationId: number;
}

export interface RecipeUpdatedPayload {
  recipeId: string;
  organizationId: number;
}
