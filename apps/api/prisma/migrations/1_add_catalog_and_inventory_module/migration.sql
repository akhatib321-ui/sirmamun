-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('OPERATIONAL', 'DOMESTIC_BULK', 'OVERSEAS_BULK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'ORDERED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('SALES_IMPORT', 'ORDER_RECEIVED', 'SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('ORDER_TODAY', 'ORDER_THIS_WEEK', 'PLAN_AHEAD');

-- CreateEnum
CREATE TYPE "SalesSource" AS ENUM ('CSV', 'TOAST_API');

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_costs" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "pkgSize" DOUBLE PRECISION NOT NULL,
    "qtyBought" INTEGER NOT NULL DEFAULT 1,
    "totalPaid" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "supplierId" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "invoiceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sellPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "useUnit" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "safetyFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "notes" TEXT,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_suppliers" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ingredient_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reports" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "source" "SalesSource" NOT NULL DEFAULT 'CSV',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "sales_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_report_items" (
    "id" TEXT NOT NULL,
    "salesReportId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "menuGroup" TEXT,
    "qtySold" INTEGER NOT NULL,
    "grossSales" DOUBLE PRECISION NOT NULL,
    "netSales" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchedRecipeId" TEXT,
    "matchConfidence" DOUBLE PRECISION,

    CONSTRAINT "sales_report_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_item_aliases" (
    "id" TEXT NOT NULL,
    "toastName" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_item_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_snapshots" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "snappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snappedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_snapshot_items" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "inventory_snapshot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_orders" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalCost" DOUBLE PRECISION,
    "invoiceRef" TEXT,
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyOrdered" DOUBLE PRECISION NOT NULL,
    "qtyReceived" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_suggestions" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "TriggerType" NOT NULL,
    "triggerSourceId" TEXT,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "notes" TEXT,

    CONSTRAINT "reorder_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_suggestion_items" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "supplierId" TEXT,
    "urgency" "Urgency" NOT NULL,
    "suggestedQty" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "currentStockEstimate" DOUBLE PRECISION,
    "parLevelEstimate" DOUBLE PRECISION,
    "daysUntilStockout" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,

    CONSTRAINT "reorder_suggestion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_suppliers_ingredientId_supplierId_key" ON "ingredient_suppliers"("ingredientId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_item_aliases_toastName_organizationId_key" ON "sales_item_aliases"("toastName", "organizationId");

-- AddForeignKey
ALTER TABLE "ingredient_costs" ADD CONSTRAINT "ingredient_costs_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_costs" ADD CONSTRAINT "ingredient_costs_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_suppliers" ADD CONSTRAINT "ingredient_suppliers_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_suppliers" ADD CONSTRAINT "ingredient_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_report_items" ADD CONSTRAINT "sales_report_items_salesReportId_fkey" FOREIGN KEY ("salesReportId") REFERENCES "sales_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_report_items" ADD CONSTRAINT "sales_report_items_matchedRecipeId_fkey" FOREIGN KEY ("matchedRecipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshot_items" ADD CONSTRAINT "inventory_snapshot_items_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "inventory_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshot_items" ADD CONSTRAINT "inventory_snapshot_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "supplier_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_suggestion_items" ADD CONSTRAINT "reorder_suggestion_items_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "reorder_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_suggestion_items" ADD CONSTRAINT "reorder_suggestion_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_suggestion_items" ADD CONSTRAINT "reorder_suggestion_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
