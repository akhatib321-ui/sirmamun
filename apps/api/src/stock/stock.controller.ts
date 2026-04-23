import { Controller, Post, Put, Param, Body } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller()
export class StockController {
  constructor(private svc: StockService) {}

  // Add a stock record (item at a location with initial qty)
  @Post('stock')
  addStock(@Body() body: { iid: string; lid: string; qty: number }) {
    return this.svc.addStock(body.iid, body.lid, body.qty);
  }

  // Adjust a single stock row to a new absolute qty
  @Put('stock/:id')
  adjust(@Param('id') id: string, @Body() body: { qty: number; note?: string }) {
    return this.svc.adjust(id, body.qty, body.note);
  }

  // Batch adjust — used by stock count mode
  @Post('stock/batch')
  batchAdjust(@Body() body: { changes: { stockId: string; qty: number }[] }) {
    return this.svc.batchAdjust(body.changes);
  }

  // Transfer between locations
  @Post('transfer')
  transfer(@Body() body: { iid: string; fromLid: string; toLid: string; qty: number }) {
    return this.svc.transfer(body.iid, body.fromLid, body.toLid, body.qty);
  }

  // CSV bulk import
  @Post('import')
  bulkImport(@Body() body: { rows: any[] }) {
    return this.svc.bulkImport(body.rows);
  }
}
