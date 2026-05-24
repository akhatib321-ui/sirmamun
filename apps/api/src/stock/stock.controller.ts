import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { LocationGuard } from '../core/auth/guards/location.guard';
import { StockService } from './stock.service';

@Controller()
export class StockController {
  constructor(private svc: StockService) {}

  @UseGuards(LocationGuard)
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

  @UseGuards(LocationGuard)
  @Post('transfer')
  transfer(@Body() body: { iid: string; fromLid: string; toLid: string; qty: number; userId?: string; userName?: string }) {
    return this.svc.transfer(body.iid, body.fromLid, body.toLid, body.qty, { userId: body.userId, userName: body.userName });
  }

  @Roles('admin')
  @Post('import')
  bulkImport(@Body() body: { rows: any[] }) {
    return this.svc.bulkImport(body.rows);
  }
}
