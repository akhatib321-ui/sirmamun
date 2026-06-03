# Aggregate Reorder — Integration Guide

## Backend

### Add two files to apps/api/src/modules/inventory/
```
aggregate-reorder.service.ts
aggregate-reorder.controller.ts
```

### Register in InventoryModule

In `inventory.module.ts`:
```typescript
import { AggregateReorderService }    from './aggregate-reorder.service';
import { AggregateReorderController } from './aggregate-reorder.controller';

@Module({
  providers: [SalesService, ReorderService, SuppliersService, AggregateReorderService],
  controllers: [SalesController, ReorderController, SuppliersController, AggregateReorderController],
})
```

### One schema note

The `aggregate-reorder.service.ts` calls `prisma.location.findMany()`.
Check that your locations table is accessible from Prisma. If it's a
legacy TypeORM table, add it to schema.prisma:

```prisma
model Location {
  id   String @id
  name String
  // ... other fields
  @@map("locations")
}
```

---

## Frontend

### Add three new files
```
src/modules/inventory/
  AggregateReorderDetail.jsx   ← new
  AggregateOrderList.jsx       ← new
```

### Replace two existing files
```
src/modules/inventory/
  ReorderOverview.jsx   ← replace (adds aggregate card at top)
  InventoryShell.jsx    ← replace (adds aggregate-detail, aggregate-order routes)
```

---

## How it flows

### Default view (reorder overview)
- **Top card**: "All locations — combined view"
  Shows ORDER TODAY / THIS WEEK / PLAN AHEAD counts summed across all locations
  Two buttons: "View combined list" and "Generate combined order"
- **Below**: Individual location cards (unchanged — still work independently)

### Combined list (aggregate-detail view)
- Table of all ingredients that need ordering, across all locations
- Each row: ingredient | supplier | urgency | total qty needed | min days remaining | est cost
- Expand any row to see per-location breakdown
- Checkboxes to select/deselect items
- Stale data warning if any location hasn't been recalculated in 72+ hours

### Combined order list (aggregate-order view)
Grouped by supplier. Behavior differs by supplier type:

**OPERATIONAL (Amazon Fresh)**
- Each item shows total qty + location split (e.g. "Kennesaw: 27 oz | Athens: 13 oz")
- "Mark as ordered" creates TWO separate SupplierOrder records (one per location)
- Each location's stock calculator picks up its own received order

**OVERSEAS_BULK / DOMESTIC_BULK (Wowbo, syrup suppliers)**
- Yellow banner: "Ships to one location" + delivery location dropdown
- Select Kennesaw or Athens as the delivery destination
- "Mark as ordered" creates ONE SupplierOrder at the selected delivery location
- Other location's stock updates naturally when staff redistribute and the next snapshot runs
- The location split is shown as a note on the order (informational, not tracked)

---

## New API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | /api/v1/inventory/reorder/aggregate | Merged reorder across all locations |
| POST | /api/v1/inventory/reorder/aggregate/recalculate | Queue fresh calc for all locations |
| POST | /api/v1/inventory/reorder/aggregate/build-order | Build combined order from selected items |

---

## Key design decisions logged

- **No schema changes** — pure aggregation layer on existing ReorderSuggestion records
- **Urgency = worst case** across locations. One location at ORDER_TODAY means the ingredient is ORDER_TODAY in aggregate.
- **Suggested qty = sum** across locations. Each location needs its own qty.
- **Days until stockout = minimum** — the most critical location drives the timeline.
- **OVERSEAS_BULK delivery** — always one location. Redistribution tracked by snapshots, not by the platform.
- **OPERATIONAL** — separate orders per location. Amazon Fresh delivers to specific addresses.
- **Stale data warning** fires at 72 hours since last calculation.
