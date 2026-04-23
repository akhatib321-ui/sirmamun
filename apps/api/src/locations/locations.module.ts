import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location } from '../entities/location.entity';
import { Stock } from '../entities/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location, Stock])],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
