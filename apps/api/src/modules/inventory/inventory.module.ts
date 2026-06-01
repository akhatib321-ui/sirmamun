// src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SalesService } from './sales/sales.service';
import { SalesController } from './sales/sales.controller';
import { ReorderService } from './reorder/reorder.service';
import { ReorderController } from './reorder/reorder.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { AggregateReorderService } from './aggregate-reorder.service';
import { AggregateReorderController } from './aggregate-reorder.controller';

/**
 * Inventory module owns:
 *   Supplier, IngredientSupplier, SalesReport, SalesReportItem,
 *   SalesItemAlias, InventorySnapshot, InventorySnapshotItem,
 *   SupplierOrder, SupplierOrderItem, ReorderSuggestion, ReorderSuggestionItem
 *
 * Reads from Catalog module (ingredients, recipes) via service imports.
 * Never queries Catalog's tables directly.
 *
 * Communicates results via EventEmitter2 events — not direct calls.
 */
@Module({
  imports: [
    EventEmitterModule,
    // Memory storage for CSV uploads — files are parsed in-memory and discarded
    MulterModule.register({ storage: undefined }), // uses memoryStorage by default
  ],
  providers: [SalesService, ReorderService, SuppliersService, AggregateReorderService],
  controllers: [SalesController, ReorderController, SuppliersController, AggregateReorderController],
  exports: [ReorderService],
})
export class InventoryModule {}
