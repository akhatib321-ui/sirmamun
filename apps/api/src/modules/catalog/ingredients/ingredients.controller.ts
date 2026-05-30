// src/modules/catalog/ingredients/ingredients.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { LocationGuard } from '../../../core/auth/guards/location.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../../shared/interfaces';
import { PaginationDto } from '../../../shared/pagination.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { AddIngredientCostDto } from './dto/add-ingredient-cost.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/catalog/ingredients')
export class IngredientsController {
  constructor(private readonly service: IngredientsService) {}

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.findOne(id, user.organizationId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateIngredientDto, @CurrentUser() user: UserContext) {
    return this.service.create(dto, user);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateIngredientDto>,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles('admin')
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.delete(id, user);
  }

  // ─── costs ─────────────────────────────────────────────────────────────────

  @Roles('admin')
  @UseGuards(LocationGuard)
  @Post(':id/costs/:locationId')
  addCost(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() dto: AddIngredientCostDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.addCost(id, locationId, dto, user);
  }

  @UseGuards(LocationGuard)
  @Get(':id/costs/:locationId')
  getCostHistory(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.getCostHistory(id, locationId, user.organizationId);
  }
}
