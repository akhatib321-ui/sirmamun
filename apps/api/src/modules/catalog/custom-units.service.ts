import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { UserContext } from '../../shared/interfaces';
import { ok } from '../../shared/response.envelope';
import { UOM_TABLE } from '../../shared/uom.util';
import { CreateCustomUnitDto } from './dto/create-custom-unit.dto';
import { UpdateCustomUnitDto } from './dto/update-custom-unit.dto';

@Injectable()
export class CustomUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: number) {
    const units = await this.prisma.customUnit.findMany({
      where: { organizationId },
      orderBy: [{ family: 'asc' }, { name: 'asc' }],
    });

    return ok(units);
  }

  async create(dto: CreateCustomUnitDto, user: UserContext) {
    const normalizedName = dto.name.trim().toLowerCase();
    if (normalizedName in UOM_TABLE) {
      throw new ConflictException(`"${normalizedName}" is already a built-in unit.`);
    }

    const existing = await this.prisma.customUnit.findFirst({
      where: { name: normalizedName, organizationId: user.organizationId },
    });
    if (existing) {
      throw new ConflictException(`Custom unit "${normalizedName}" already exists.`);
    }

    const unit = await this.prisma.customUnit.create({
      data: {
        name: normalizedName,
        label: dto.label.trim(),
        family: dto.family,
        baseValue: dto.baseValue,
        notes: dto.notes?.trim() || null,
        organizationId: user.organizationId,
      },
    });

    return ok(unit);
  }

  async update(id: string, dto: UpdateCustomUnitDto, user: UserContext) {
    await this.ensureExists(id, user.organizationId);

    const unit = await this.prisma.customUnit.update({
      where: { id },
      data: {
        label: dto.label?.trim(),
        family: dto.family,
        baseValue: dto.baseValue,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
      },
    });

    return ok(unit);
  }

  async remove(id: string, user: UserContext) {
    const unit = await this.ensureExists(id, user.organizationId);
    const inUseCount = await this.prisma.ingredient.count({
      where: { organizationId: user.organizationId, unit: unit.name },
    });

    await this.prisma.customUnit.delete({ where: { id } });
    return ok({ deleted: true, ingredientsAffected: inUseCount });
  }

  private async ensureExists(id: string, organizationId: number) {
    const unit = await this.prisma.customUnit.findFirst({
      where: { id, organizationId },
    });

    if (!unit) {
      throw new NotFoundException('Custom unit not found');
    }

    return unit;
  }
}