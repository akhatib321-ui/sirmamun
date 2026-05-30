// src/modules/inventory/suppliers/suppliers.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../../shared/interfaces';
import { PaginationDto } from '../../../shared/pagination.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/inventory/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto, @CurrentUser() user: UserContext) {
    return this.service.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.findOne(id, user.organizationId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: UserContext) {
    return this.service.create(dto, user);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplierDto>,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles('admin')
  @Post(':supplierId/ingredients/:ingredientId')
  linkIngredient(
    @Param('supplierId') supplierId: string,
    @Param('ingredientId') ingredientId: string,
    @Query('preferred') preferred: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.linkIngredient(
      supplierId,
      ingredientId,
      preferred === 'true',
      user,
    );
  }
}
