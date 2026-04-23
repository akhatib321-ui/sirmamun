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

  async create(name: string) {
    const exists = await this.repo.findOneBy({ name });
    if (exists) throw new BadRequestException('Location already exists');
    return this.repo.save(this.repo.create({ name }));
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
