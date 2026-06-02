ALTER TABLE "ingredients"
ADD COLUMN "stockItemId" TEXT;

CREATE TABLE "custom_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "organizationId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_units_name_organizationId_key"
ON "custom_units"("name", "organizationId");