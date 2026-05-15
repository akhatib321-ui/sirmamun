import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location) private repo: Repository<Location>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
  ) {}

  async create(name: string, parentId?: string | null) {
    const exists = await this.repo.findOneBy({ name });
    if (exists) throw new BadRequestException('Location already exists');

    if (parentId) {
      const parent = await this.repo.findOneBy({ id: parentId });
      if (!parent) throw new BadRequestException('Parent location not found');
      if (parent.parentId) {
        throw new BadRequestException('Parent location cannot be a child location');
      }
    }

    return this.repo.save(this.repo.create({ name, parentId: parentId ?? null }));
  }

  async update(id: string, dto: { name?: string; parentId?: string | null }) {
    const loc = await this.repo.findOneBy({ id });
    if (!loc) throw new NotFoundException();

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Location name is required');
      const exists = await this.repo.findOneBy({ name });
      if (exists && exists.id !== id) throw new BadRequestException('Location already exists');
      loc.name = name;
    }

    if (dto.parentId !== undefined) {
      const nextParentId = dto.parentId;

      if (nextParentId === id) {
        throw new BadRequestException('Location cannot be its own parent');
      }

      if (nextParentId) {
        const parent = await this.repo.findOneBy({ id: nextParentId });
        if (!parent) throw new BadRequestException('Parent location not found');
        if (parent.parentId) {
          throw new BadRequestException('Parent location cannot be a child location');
        }

        const hasChildren = await this.repo.findOneBy({ parentId: id });
        if (hasChildren) {
          throw new BadRequestException('A parent location cannot be assigned under another parent');
        }
      }

      loc.parentId = nextParentId ?? null;
    }

    return this.repo.save(loc);
  }

  async remove(id: string) {
    const hasStock = await this.stockRepo.findOneBy({ lid: id });
    if (hasStock) throw new BadRequestException('Cannot remove a location that has stock');
    const loc = await this.repo.findOneBy({ id });
    if (!loc) throw new NotFoundException();
    await this.repo.remove(loc);
    return { ok: true };
  }
}
