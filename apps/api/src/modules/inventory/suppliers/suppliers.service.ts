// src/modules/inventory/suppliers/suppliers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ok, paginated } from '../../../shared/response.envelope';
import { PaginationDto } from '../../../shared/pagination.dto';
import { UserContext } from '../../../shared/interfaces';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: number, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { organizationId },
        include: { ingredientLinks: { include: { ingredient: { select: { name: true } } } } },
        orderBy: { name: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.supplier.count({ where: { organizationId } }),
    ]);
    return paginated(items, total, pagination.page, pagination.limit);
  }

  async findOne(id: string, organizationId: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        ingredientLinks: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
        orders: { orderBy: { orderedAt: 'desc' }, take: 5 },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return ok(supplier);
  }

  async create(dto: CreateSupplierDto, user: UserContext) {
    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        type: dto.type,
        leadTimeDays: dto.leadTimeDays,
        safetyFactor: dto.safetyFactor ?? 1.3,
        notes: dto.notes,
        organizationId: user.organizationId,
      },
    });
    return ok(supplier);
  }

  async update(id: string, dto: Partial<CreateSupplierDto>, user: UserContext) {
    await this.ensureExists(id, user.organizationId);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        leadTimeDays: dto.leadTimeDays,
        safetyFactor: dto.safetyFactor,
        notes: dto.notes,
      },
    });
    return ok(updated);
  }

  async linkIngredient(
    supplierId: string,
    ingredientId: string,
    preferred: boolean,
    user: UserContext,
  ) {
    await this.ensureExists(supplierId, user.organizationId);

    // If setting as preferred, clear any existing preferred link for this ingredient
    if (preferred) {
      await this.prisma.ingredientSupplier.updateMany({
        where: { ingredientId, preferred: true },
        data: { preferred: false },
      });
    }

    const link = await this.prisma.ingredientSupplier.upsert({
      where: { ingredientId_supplierId: { ingredientId, supplierId } },
      create: { ingredientId, supplierId, preferred },
      update: { preferred },
    });

    return ok(link);
  }

  private async ensureExists(id: string, organizationId: number) {
    const found = await this.prisma.supplier.findFirst({ where: { id, organizationId } });
    if (!found) throw new NotFoundException('Supplier not found');
    return found;
  }
}
