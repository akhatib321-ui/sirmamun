import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(name: string, parentId?: string | null) {
    const exists = await this.prisma.location.findFirst({ where: { name } });
    if (exists) throw new BadRequestException('Location already exists');

    if (parentId) {
      const parent = await this.prisma.location.findUnique({ where: { id: parentId } });
      if (!parent) throw new BadRequestException('Parent location not found');
      if (parent.parentId) {
        throw new BadRequestException('Parent location cannot be a child location');
      }
    }

    return this.prisma.location.create({
      data: { name, parentId: parentId ?? null },
    });
  }

  async update(id: string, dto: { name?: string; parentId?: string | null }) {
    const loc = await this.prisma.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException();

    let nextName = loc.name;
    let nextParentId = loc.parentId;

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Location name is required');
      const exists = await this.prisma.location.findFirst({ where: { name } });
      if (exists && exists.id !== id) throw new BadRequestException('Location already exists');
      nextName = name;
    }

    if (dto.parentId !== undefined) {
      const requestedParentId = dto.parentId;

      if (requestedParentId === id) {
        throw new BadRequestException('Location cannot be its own parent');
      }

      if (requestedParentId) {
        const parent = await this.prisma.location.findUnique({
          where: { id: requestedParentId },
        });
        if (!parent) throw new BadRequestException('Parent location not found');
        if (parent.parentId) {
          throw new BadRequestException('Parent location cannot be a child location');
        }

        const hasChildren = await this.prisma.location.findFirst({
          where: { parentId: id },
        });
        if (hasChildren) {
          throw new BadRequestException('A parent location cannot be assigned under another parent');
        }
      }

      nextParentId = requestedParentId ?? null;
    }

    return this.prisma.location.update({
      where: { id },
      data: { name: nextName, parentId: nextParentId },
    });
  }

  async remove(id: string) {
    const loc = await this.prisma.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException();
    const hasStock = await this.prisma.stock.findFirst({ where: { lid: id } });
    if (hasStock) throw new BadRequestException('Cannot remove a location that has stock');

    await this.prisma.location.delete({ where: { id } });
    return { ok: true };
  }
}
