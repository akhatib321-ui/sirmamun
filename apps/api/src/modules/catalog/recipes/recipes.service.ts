// src/modules/catalog/recipes/recipes.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Events } from '../../../events/event-types';
import { ok, paginated } from '../../../shared/response.envelope';
import { PaginationDto } from '../../../shared/pagination.dto';
import { UserContext } from '../../../shared/interfaces';
import { unitsCompatible } from '../../../shared/uom.util';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { AddRecipeIngredientDto } from './dto/add-recipe-ingredient.dto';

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(organizationId: number, locationId?: string, pagination?: PaginationDto) {
    const page = pagination ?? new PaginationDto();
    const where = { organizationId, active: true, ...(locationId ? { locationId } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        include: {
          ingredients: {
            include: { ingredient: { include: { costs: { orderBy: { purchaseDate: 'desc' }, take: 1 } } } },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: page.skip,
        take: page.limit,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    return paginated(items, total, page.page, page.limit);
  }

  async findOne(id: string, organizationId: number) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, organizationId },
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: { costs: { orderBy: { purchaseDate: 'desc' }, take: 1 } },
            },
          },
        },
      },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return ok(recipe);
  }

  async create(dto: CreateRecipeDto, user: UserContext) {
    const recipe = await this.prisma.recipe.create({
      data: {
        name: dto.name,
        category: dto.category,
        sellPrice: dto.sellPrice ?? 0,
        locationId: dto.locationId,
        organizationId: user.organizationId,
      },
    });
    return ok(recipe);
  }

  async update(id: string, dto: Partial<CreateRecipeDto>, user: UserContext) {
    await this.ensureExists(id, user.organizationId);
    const updated = await this.prisma.recipe.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        sellPrice: dto.sellPrice,
        active: dto.active,
      },
    });
    this.eventEmitter.emit(Events.RECIPE_UPDATED, {
      recipeId: id,
      organizationId: user.organizationId,
    });
    return ok(updated);
  }

  async addIngredient(
    recipeId: string,
    dto: AddRecipeIngredientDto,
    user: UserContext,
  ) {
    await this.ensureExists(recipeId, user.organizationId);

    // Validate ingredient exists in this org
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: dto.ingredientId, organizationId: user.organizationId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    // Validate units are compatible
    if (!unitsCompatible(ingredient.unit, dto.useUnit)) {
      throw new BadRequestException(
        `Unit "${dto.useUnit}" is not compatible with ingredient's buy unit "${ingredient.unit}"`,
      );
    }

    const ri = await this.prisma.recipeIngredient.upsert({
      where: { recipeId_ingredientId: { recipeId, ingredientId: dto.ingredientId } },
      create: {
        recipeId,
        ingredientId: dto.ingredientId,
        quantity: dto.quantity,
        useUnit: dto.useUnit,
      },
      update: {
        quantity: dto.quantity,
        useUnit: dto.useUnit,
      },
    });

    this.eventEmitter.emit(Events.RECIPE_UPDATED, {
      recipeId,
      organizationId: user.organizationId,
    });

    return ok(ri);
  }

  async removeIngredient(recipeId: string, ingredientId: string, user: UserContext) {
    await this.ensureExists(recipeId, user.organizationId);
    await this.prisma.recipeIngredient.delete({
      where: { recipeId_ingredientId: { recipeId, ingredientId } },
    });
    this.eventEmitter.emit(Events.RECIPE_UPDATED, {
      recipeId,
      organizationId: user.organizationId,
    });
    return ok({ deleted: true });
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async ensureExists(id: string, organizationId: number) {
    const found = await this.prisma.recipe.findFirst({ where: { id, organizationId } });
    if (!found) throw new NotFoundException('Recipe not found');
    return found;
  }
}
