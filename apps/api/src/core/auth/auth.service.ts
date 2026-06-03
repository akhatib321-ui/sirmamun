import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './types/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    const users = await this.prisma.user.findMany({
      where: { active: true },
    });

    let matchedUser: (typeof users)[0] | null = null;

    for (const user of users) {
      const valid = await this.verifyPin(dto.pin, user.pin);
      if (valid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Progressive migration: hash plain-text PINs on first login
    if (!this.isBcryptHash(matchedUser.pin)) {
      const hashed = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);
      await this.prisma.user.update({
        where: { id: matchedUser.id },
        data: { pin: hashed },
      });
    }

    // locationIds is stored as a JSON string (TypeORM simple-json → TEXT column)
    // Parse it here; empty array → null → access to all locations
    const locationIds = this.prisma.parseJson<string[]>(
      matchedUser.locationIds,
      [],
    );

    const payload: JwtPayload = {
      sub: matchedUser.id,                          // UUID string
      role: matchedUser.role as 'admin' | 'staff',
      organizationId: matchedUser.organizationId,
      locationIds: locationIds.length > 0 ? locationIds : null,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        organizationId: matchedUser.organizationId,
        locationIds,
      },
    };
  }

  async hashPin(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map(({ pin: _, locationIds, ...user }) => ({
      ...user,
      locationIds: this.prisma.parseJson<string[]>(locationIds, []),
    }));
  }

  async createUser(body: {
    name: string;
    pin: string;
    role?: string;
    locationIds?: string[];
    active?: boolean;
  }) {
    const pinInUse = await this.isPinInUse(body.pin);
    if (pinInUse) {
      throw new UnauthorizedException('PIN already in use');
    }

    const created = await this.prisma.user.create({
      data: {
        name: body.name,
        pin: await this.hashPin(body.pin),
        role: body.role === 'admin' ? 'admin' : 'staff',
        active: body.active ?? true,
        locationIds: this.prisma.serializeJson(body.locationIds ?? []),
      },
    });

    const { pin: _, locationIds, ...safe } = created;
    return {
      ...safe,
      locationIds: this.prisma.parseJson<string[]>(locationIds, []),
    };
  }

  async updateUser(
    id: string,
    body: {
      name?: string;
      pin?: string;
      role?: string;
      locationIds?: string[];
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }

    if (body.pin) {
      const pinInUse = await this.isPinInUse(body.pin, id);
      if (pinInUse) {
        throw new UnauthorizedException('PIN already in use');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.pin !== undefined ? { pin: await this.hashPin(body.pin) } : {}),
        ...(body.role !== undefined
          ? { role: body.role === 'admin' ? 'admin' : 'staff' }
          : {}),
        ...(body.locationIds !== undefined
          ? { locationIds: this.prisma.serializeJson(body.locationIds) }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });

    const { pin: _, locationIds, ...safe } = updated;
    return {
      ...safe,
      locationIds: this.prisma.parseJson<string[]>(locationIds, []),
    };
  }

  async deleteUser(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }

    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  async seedAdmin() {
    const count = await this.prisma.user.count();
    if (count > 0) {
      return;
    }

    await this.prisma.user.create({
      data: {
        name: 'Admin',
        pin: await this.hashPin('2522'),
        role: 'admin',
        locationIds: this.prisma.serializeJson([]),
      },
    });
  }

  private async verifyPin(plain: string, stored: string): Promise<boolean> {
    if (this.isBcryptHash(stored)) {
      return bcrypt.compare(plain, stored);
    }
    return plain === stored;
  }

  private isBcryptHash(value: string): boolean {
    return value?.startsWith('$2b$') || value?.startsWith('$2a$');
  }

  private async isPinInUse(pin: string, excludeUserId?: string): Promise<boolean> {
    const users = await this.prisma.user.findMany();

    for (const user of users) {
      if (excludeUserId && user.id === excludeUserId) {
        continue;
      }

      const matches = await this.verifyPin(pin, user.pin);
      if (matches) {
        return true;
      }
    }

    return false;
  }
}
