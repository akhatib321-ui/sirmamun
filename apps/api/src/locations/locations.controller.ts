import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private svc: LocationsService) {}

  @Post()
  create(@Body('name') name: string) {
    return this.svc.create(name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
