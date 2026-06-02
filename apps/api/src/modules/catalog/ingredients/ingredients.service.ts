// src/modules/catalog/ingredients/ingredients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Events } from '../../../events/event-types';
import { ok, paginated } from '../../../shared/response.envelope';
import { PaginationDto } from '../../../shared/pagination.dto';
import { UserContext } from '../../../shared/interfaces';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { AddIngredientCostDto } from './dto/add-ingredient-cost.dto';

@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(organizationId: number, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.ingredient.findMany({
        where: { organizationId },
        include: {
          costs: { orderBy: { purchaseDate: 'desc' }, take: 1 },
          recipeIngredients: { select: { useUnit: true } },
        },
        orderBy: { name: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.ingredient.count({ where: { organizationId } }),
    ]);

    return paginated(items, total, pagination.page, pagination.limit);
  }

  async findOne(id: string, organizationId: number) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, organizationId },
      include: {
        costs: { orderBy: { purchaseDate: 'desc' } },
        supplierLinks: { include: { supplier: true } },
        recipeIngredients: { include: { recipe: true } },
      },
    });

    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return ok(ingredient);
  }

  async create(dto: CreateIngredientDto, user: UserContext) {
    const ingredient = await this.prisma.ingredient.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        notes: dto.notes,
        organizationId: user.organizationId,
      },
    });
    return ok(ingredient);
  }

  async update(id: string, dto: Partial<CreateIngredientDto>, user: UserContext) {
    await this.ensureExists(id, user.organizationId);
    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: { name: dto.name, unit: dto.unit, notes: dto.notes },
    });
    return ok(updated);
  }

  async delete(id: string, user: UserContext) {
    await this.ensureExists(id, user.organizationId);
    await this.prisma.ingredient.delete({ where: { id } });
    return ok({ deleted: true });
  }

  // ─── costs ───────────────────────────────────────────────────────────────

  async addCost(
    ingredientId: string,
    locationId: string,
    dto: AddIngredientCostDto,
    user: UserContext,
  ) {
    await this.ensureExists(ingredientId, user.organizationId);

    const unitCost = dto.totalPaid / (dto.pkgSize * dto.qtyBought);

    const cost = await this.prisma.ingredientCost.create({
      data: {
        ingredientId,
        locationId,
        buyUnit: dto.buyUnit,
        pkgSize: dto.pkgSize,
        qtyBought: dto.qtyBought,
        totalPaid: dto.totalPaid,
        unitCost: parseFloat(unitCost.toFixed(6)),
        supplierId: dto.supplierId ?? null,
        purchaseDate: new Date(dto.purchaseDate),
        invoiceRef: dto.invoiceRef ?? null,
      },
    });

    this.eventEmitter.emit(Events.INGREDIENT_COST_UPDATED, {
      ingredientId,
      locationId,
      organizationId: user.organizationId,
    });

    return ok(cost);
  }

  async getCostHistory(ingredientId: string, locationId: string, organizationId: number) {
    await this.ensureExists(ingredientId, organizationId);
    const costs = await this.prisma.ingredientCost.findMany({
      where: { ingredientId, locationId },
      orderBy: { purchaseDate: 'desc' },
      include: { supplier: { select: { name: true } } },
    });
    return ok(costs);
  }

  async getLatestCost(ingredientId: string, locationId: string) {
    return this.prisma.ingredientCost.findFirst({
      where: { ingredientId, locationId },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async ensureExists(id: string, organizationId: number) {
    const found = await this.prisma.ingredient.findFirst({
      where: { id, organizationId },
    });
    if (!found) throw new NotFoundException('Ingredient not found');
    return found;
  }
}
