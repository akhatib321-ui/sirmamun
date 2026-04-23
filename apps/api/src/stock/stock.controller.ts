import { Controller, Post, Put, Param, Body } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller()
export class StockController {
  constructor(private svc: StockService) {}

  @Post('stock')
  addStock(@Body() body: { iid: string; lid: string; qty: number }) {
    return this.svc.addStock(body.iid, body.lid, body.qty);
  }

  @Put('stock/:id')
  adjust(@Param('id') id: string, @Body() body: { qty: number; note?: string; userId?: string; userName?: string }) {
    return this.svc.adjust(id, body.qty, { userId: body.userId, userName: body.userName }, body.note);
  }

  @Post('stock/batch')
  batchAdjust(@Body() body: { changes: { stockId: string; qty: number }[]; userId?: string; userName?: string }) {
    return this.svc.batchAdjust(body.changes, { userId: body.userId, userName: body.userName });
  }

  @Post('stock/consume')
  consume(@Body() body: { stockId: string; amount: number; userId?: string; userName?: string }) {
    return this.svc.consume(body.stockId, body.amount, { userId: body.userId, userName: body.userName });
  }

  @Post('transfer')
  transfer(@Body() body: { iid: string; fromLid: string; toLid: string; qty: number; userId?: string; userName?: string }) {
    return this.svc.transfer(body.iid, body.fromLid, body.toLid, body.qty, { userId: body.userId, userName: body.userName });
  }

  @Post('import')
  bulkImport(@Body() body: { rows: any[] }) {
    return this.svc.bulkImport(body.rows);
  }
}
