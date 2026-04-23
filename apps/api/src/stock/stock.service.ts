import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { Log } from '../entities/log.entity';
import { Location } from '../entities/location.entity';
import { Item } from '../entities/item.entity';
import { ItemsService } from '../items/items.service';

interface Actor { userId?: string; userName?: string; }

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
    @InjectRepository(Log) private logRepo: Repository<Log>,
    @InjectRepository(Location) private locationRepo: Repository<Location>,
    @InjectRepository(Item) private itemRepo: Repository<Item>,
    private itemsService: ItemsService,
  ) {}

  private logBase(actor: Actor) {
    return { userId: actor.userId ?? null, userName: actor.userName ?? null };
  }

  async addStock(iid: string, lid: string, qty: number) {
    const existing = await this.stockRepo.findOneBy({ iid, lid });
    if (existing) { existing.qty += qty; return this.stockRepo.save(existing); }
    return this.stockRepo.save(this.stockRepo.create({ iid, lid, qty }));
  }

  async adjust(stockId: string, newQty: number, actor: Actor, note?: string) {
    const row = await this.stockRepo.findOneBy({ id: stockId });
    if (!row) throw new NotFoundException('Stock record not found');
    if (newQty < 0) throw new BadRequestException('Quantity cannot be negative');
    const delta = newQty - row.qty;
    const fromQty = row.qty;
    row.qty = newQty;
    await this.stockRepo.save(row);
    await this.logRepo.save(this.logRepo.create({
      ts: Date.now(), type: 'adj', iid: row.iid, lid: row.lid,
      delta, fromQty, toQty: newQty, note: note ?? null,
      ...this.logBase(actor),
    }));
    return row;
  }

  async consume(stockId: string, amount: number, actor: Actor) {
    if (amount <= 0) throw new BadRequestException('Amount must be at least 1');
    const row = await this.stockRepo.findOneBy({ id: stockId });
    if (!row) throw new NotFoundException('Stock record not found');
    if (row.qty < amount) throw new BadRequestException('Only ' + row.qty + ' available');
    const fromQty = row.qty;
    row.qty -= amount;
    await this.stockRepo.save(row);
    await this.logRepo.save(this.logRepo.create({
      ts: Date.now(), type: 'consume', iid: row.iid, lid: row.lid,
      delta: -amount, fromQty, toQty: row.qty,
      ...this.logBase(actor),
    }));
    return row;
  }

  async transfer(iid: string, fromLid: string, toLid: string, qty: number, actor: Actor) {
    if (fromLid === toLid) throw new BadRequestException('Source and destination must differ');
    if (qty <= 0) throw new BadRequestException('Quantity must be at least 1');
    const fromRow = await this.stockRepo.findOneBy({ iid, lid: fromLid });
    if (!fromRow || fromRow.qty < qty)
      throw new BadRequestException('Only ' + (fromRow?.qty ?? 0) + ' available at source');
    fromRow.qty -= qty;
    await this.stockRepo.save(fromRow);
    let toRow = await this.stockRepo.findOneBy({ iid, lid: toLid });
    if (toRow) { toRow.qty += qty; await this.stockRepo.save(toRow); }
    else toRow = await this.stockRepo.save(this.stockRepo.create({ iid, lid: toLid, qty }));
    await this.logRepo.save(this.logRepo.create({
      ts: Date.now(), type: 'xfr', iid, fromLid, toLid, qty,
      ...this.logBase(actor),
    }));
    return { from: fromRow, to: toRow };
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
      let loc = await this.locationRepo.findOneBy({ name: row.locationName });
      if (!loc) loc = await this.locationRepo.save(this.locationRepo.create({ name: row.locationName }));
      let item = await this.itemRepo.findOneBy({ name: row.itemName });
      if (!item) item = await this.itemRepo.save(this.itemRepo.create({
        name: row.itemName, uom: row.uom,
        desc: row.desc ?? '', supplier: row.supplier ?? '', lowAt: row.lowAt ?? 2,
      }));
      await this.addStock(item.id, loc.id, row.qty);
      created++;
    }
    return { imported: created };
  }
}
