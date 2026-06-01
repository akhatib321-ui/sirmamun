// src/modules/catalog/recipes/recipes.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { LocationGuard } from '../../../core/auth/guards/location.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../../shared/interfaces';
import { PaginationDto } from '../../../shared/pagination.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { AddRecipeIngredientDto } from './dto/add-recipe-ingredient.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @UseGuards(LocationGuard)
  @Get(':locationId')
  findAll(
    @Param('locationId') locationId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.findAll(user.organizationId, locationId, pagination);
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateRecipeDto, @CurrentUser() user: UserContext) {
    return this.service.create(dto, user);
  }

  @Roles('admin')
  @Patch('detail/:id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRecipeDto>,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles('admin')
  @Post('detail/:id/ingredients')
  addIngredient(
    @Param('id') id: string,
    @Body() dto: AddRecipeIngredientDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.addIngredient(id, dto, user);
  }

  @Roles('admin')
  @Delete('detail/:id/ingredients/:ingredientId')
  removeIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.removeIngredient(id, ingredientId, user);
  }
}
