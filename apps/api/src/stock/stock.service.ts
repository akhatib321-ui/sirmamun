import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

interface Actor { userId?: string; userName?: string; }

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  private logBase(actor: Actor) {
    return { userId: actor.userId ?? null, userName: actor.userName ?? null };
  }

  async addStock(iid: string, lid: string, qty: number) {
    const existing = await this.prisma.stock.findFirst({ where: { iid, lid } });
    if (existing) {
      return this.prisma.stock.update({
        where: { id: existing.id },
        data: { qty: existing.qty + qty },
      });
    }

    return this.prisma.stock.create({ data: { iid, lid, qty } });
  }

  async adjust(stockId: string, newQty: number, actor: Actor, note?: string) {
    const row = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!row) throw new NotFoundException('Stock record not found');
    if (newQty < 0) throw new BadRequestException('Quantity cannot be negative');

    const delta = newQty - row.qty;
    const fromQty = row.qty;

    const updated = await this.prisma.stock.update({
      where: { id: row.id },
      data: { qty: newQty },
    });

    await this.prisma.log.create({
      data: {
        ts: BigInt(Date.now()),
        type: 'adj',
        iid: row.iid,
        lid: row.lid,
        delta,
        fromQty,
        toQty: newQty,
        note: note ?? null,
        ...this.logBase(actor),
      },
    });

    return updated;
  }

  async consume(stockId: string, amount: number, actor: Actor) {
    if (amount <= 0) throw new BadRequestException('Amount must be at least 1');
    const row = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!row) throw new NotFoundException('Stock record not found');
    if (row.qty < amount) throw new BadRequestException('Only ' + row.qty + ' available');

    const fromQty = row.qty;

    const updated = await this.prisma.stock.update({
      where: { id: row.id },
      data: { qty: row.qty - amount },
    });

    await this.prisma.log.create({
      data: {
        ts: BigInt(Date.now()),
        type: 'consume',
        iid: row.iid,
        lid: row.lid,
        delta: -amount,
        fromQty,
        toQty: updated.qty,
        ...this.logBase(actor),
      },
    });

    return updated;
  }

  async transfer(iid: string, fromLid: string, toLid: string, qty: number, actor: Actor) {
    if (fromLid === toLid) throw new BadRequestException('Source and destination must differ');
    if (qty <= 0) throw new BadRequestException('Quantity must be at least 1');

    const fromRow = await this.prisma.stock.findFirst({ where: { iid, lid: fromLid } });
    if (!fromRow || fromRow.qty < qty)
      throw new BadRequestException('Only ' + (fromRow?.qty ?? 0) + ' available at source');

    const updatedFrom = await this.prisma.stock.update({
      where: { id: fromRow.id },
      data: { qty: fromRow.qty - qty },
    });

    const existingTo = await this.prisma.stock.findFirst({ where: { iid, lid: toLid } });
    const updatedTo = existingTo
      ? await this.prisma.stock.update({
          where: { id: existingTo.id },
          data: { qty: existingTo.qty + qty },
        })
      : await this.prisma.stock.create({ data: { iid, lid: toLid, qty } });

    await this.prisma.log.create({
      data: {
        ts: BigInt(Date.now()),
        type: 'xfr',
        iid,
        fromLid,
        toLid,
        qty,
        ...this.logBase(actor),
      },
    });

    return { from: updatedFrom, to: updatedTo };
  }

  async batchAdjust(changes: { stockId: string; qty: number }[], actor: Actor) {
    const results = [];
    for (const { stockId, qty } of changes)
      results.push(await this.adjust(stockId, qty, actor, 'stock count'));
    return results;
  }

  async bulkImport(rows: any[]) {
    let created = 0;
    for (const row of rows) {
      let loc = await this.prisma.location.findFirst({ where: { name: row.locationName } });
      if (!loc) {
        loc = await this.prisma.location.create({ data: { name: row.locationName } });
      }

      let item = await this.prisma.item.findFirst({ where: { name: row.itemName } });
      if (!item) {
        item = await this.prisma.item.create({
          data: {
            name: row.itemName,
            uom: row.uom,
            desc: row.desc ?? '',
            supplier: row.supplier ?? '',
            lowAt: row.lowAt ?? 2,
          },
        });
      }

      await this.addStock(item.id, loc.id, row.qty);
      created++;
    }
    return { imported: created };
  }
}
