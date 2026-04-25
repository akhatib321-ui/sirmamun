import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';
import { Item } from '../entities/item.entity';
import { Stock } from '../entities/stock.entity';
import { Log } from '../entities/log.entity';
import { SettingsService } from '../settings/settings.service';

@Controller('bootstrap')
export class BootstrapController {
  constructor(
    @InjectRepository(Location) private locations: Repository<Location>,
    @InjectRepository(Item) private items: Repository<Item>,
    @InjectRepository(Stock) private stock: Repository<Stock>,
    @InjectRepository(Log) private log: Repository<Log>,
    private settingsSvc: SettingsService,
  ) {}

  @Get()
  async bootstrap() {
    const [locations, items, stock, log, settings] = await Promise.all([
      this.locations.find({ order: { createdAt: 'ASC' } }),
      this.items.find({ order: { name: 'ASC' } }),
      this.stock.find(),
      this.log.find({ order: { ts: 'DESC' }, take: 300 }),
      this.settingsSvc.get(),
    ]);
    return { locations, items, stock, log, settings };
  }
}
