import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { Item } from '../entities/item.entity';
import { Stock } from '../entities/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Stock])],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
