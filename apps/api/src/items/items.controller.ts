import { Controller, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private svc: ItemsService) {}

  @Roles('admin')
  @Post()
  create(@Body() dto: any) {
    return this.svc.create(dto);
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
