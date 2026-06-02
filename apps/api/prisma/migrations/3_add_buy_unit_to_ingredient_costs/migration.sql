ALTER TABLE "ingredient_costs"
ADD COLUMN "buyUnit" TEXT;

UPDATE "ingredient_costs"
SET "buyUnit" = COALESCE("buyUnit", (
  SELECT "unit"
  FROM "ingredients"
  WHERE "ingredients"."id" = "ingredient_costs"."ingredientId"
  LIMIT 1
));

ALTER TABLE "ingredient_costs"
ALTER COLUMN "buyUnit" SET NOT NULL;