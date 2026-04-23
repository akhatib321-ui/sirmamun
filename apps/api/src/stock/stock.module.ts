import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { Stock } from '../entities/stock.entity';
import { Log } from '../entities/log.entity';
import { Location } from '../entities/location.entity';
import { Item } from '../entities/item.entity';
import { ItemsService } from '../items/items.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Log, Location, Item])],
  controllers: [StockController],
  providers: [StockService, ItemsService],
})
export class StockModule {}
