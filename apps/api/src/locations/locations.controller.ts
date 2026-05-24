import { Controller, Post, Delete, Param, Body, Put } from '@nestjs/common';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private svc: LocationsService) {}

  @Roles('admin')
  @Post()
  create(@Body() dto: { name: string; parentId?: string | null }) {
    return this.svc.create(dto.name, dto.parentId);
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
