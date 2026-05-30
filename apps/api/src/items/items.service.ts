import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: {
    name: string;
    uom: string;
    desc?: string;
    supplier?: string;
    lowAt?: number;
  }) {
    return this.prisma.item.create({
      data: {
        name: dto.name,
        uom: dto.uom,
        desc: dto.desc ?? '',
        supplier: dto.supplier ?? '',
        lowAt: dto.lowAt ?? 2,
      },
    });
  }

  async update(
    id: string,
    dto: {
      name?: string;
      uom?: string;
      desc?: string;
      supplier?: string;
      lowAt?: number;
    },
  ) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();

    return this.prisma.item.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.uom !== undefined ? { uom: dto.uom } : {}),
        ...(dto.desc !== undefined ? { desc: dto.desc } : {}),
        ...(dto.supplier !== undefined ? { supplier: dto.supplier } : {}),
        ...(dto.lowAt !== undefined ? { lowAt: dto.lowAt } : {}),
      },
    });
  }

  async remove(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException();

    await this.prisma.stock.deleteMany({ where: { iid: id } });
    await this.prisma.item.delete({ where: { id } });
    return { ok: true };
  }

  async bulkUpsert(rows: { name: string; uom: string; desc?: string; supplier?: string; lowAt?: number }[]) {
    const results = [];
    for (const row of rows) {
      let item = await this.prisma.item.findFirst({ where: { name: row.name } });
      if (!item) {
        item = await this.prisma.item.create({
          data: {
            name: row.name,
            uom: row.uom,
            desc: row.desc ?? '',
            supplier: row.supplier ?? '',
            lowAt: row.lowAt ?? 2,
          },
        });
      }
      results.push(item);
    }
    return results;
  }
}
