import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../entities/item.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item) private repo: Repository<Item>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
  ) {}

  async create(dto: Partial<Item>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: Partial<Item>) {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new NotFoundException();
    return this.repo.save({ ...item, ...dto });
  }

  async remove(id: string) {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new NotFoundException();
    // Cascade delete stock rows for this item
    await this.stockRepo.delete({ iid: id });
    await this.repo.remove(item);
    return { ok: true };
  }

  async bulkUpsert(rows: { name: string; uom: string; desc?: string; supplier?: string; lowAt?: number }[]) {
    const results = [];
    for (const row of rows) {
      let item = await this.repo.findOneBy({ name: row.name });
      if (!item) {
        item = await this.repo.save(this.repo.create(row));
      }
      results.push(item);
    }
    return results;
  }
}
