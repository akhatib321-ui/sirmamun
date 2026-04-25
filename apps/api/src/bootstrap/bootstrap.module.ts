import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BootstrapController } from './bootstrap.controller';
import { Location } from '../entities/location.entity';
import { Item } from '../entities/item.entity';
import { Stock } from '../entities/stock.entity';
import { Log } from '../entities/log.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Location, Item, Stock, Log]), SettingsModule],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
