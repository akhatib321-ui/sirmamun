import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const users = await this.usersRepo.find();
    const user = await this.findByPin(users, dto.pin);

    if (!user) {
      throw new UnauthorizedException('Invalid PIN');
    }

    if (!user.active) {
      throw new UnauthorizedException('User is inactive');
    }

    if (!this.isBcryptHash(user.pin)) {
      user.pin = await bcrypt.hash(dto.pin, 10);
      await this.usersRepo.save(user);
    }

    const payload: JwtPayload = {
      sub: user.id,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      locationIds: Array.isArray(user.locationIds) ? user.locationIds : [],
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        organizationId: payload.organizationId,
        locationIds: payload.locationIds,
      },
    };
  }

  async seedAdmin() {
    const count = await this.usersRepo.count();
    if (count > 0) {
      return;
    }

    const adminPin = '0000';
    const hashedPin = await bcrypt.hash(adminPin, 10);
    await this.usersRepo.save(
      this.usersRepo.create({
        name: 'Admin',
        pin: hashedPin,
        role: 'admin',
        organizationId: 1,
        active: true,
        locationIds: [],
      }),
    );
    console.warn('Seeded default admin user. Change the default PIN immediately.');
  }

  async listUsers() {
    const users = await this.usersRepo.find({ order: { createdAt: 'ASC' } });
    return users.map(({ pin: _pin, ...safe }) => safe);
  }

  async createUser(input: { name: string; pin: string; role?: string; locationIds?: string[]; active?: boolean }) {
    if (!input?.name?.trim() || !input?.pin?.trim()) {
      throw new ConflictException('Name and PIN are required');
    }

    const exists = await this.isPinInUse(input.pin);
    if (exists) {
      throw new ConflictException('PIN already in use');
    }

    const user = this.usersRepo.create({
      name: input.name.trim(),
      pin: await bcrypt.hash(input.pin, 10),
      role: input.role ?? 'staff',
      locationIds: Array.isArray(input.locationIds) ? input.locationIds : [],
      active: input.active ?? true,
      organizationId: 1,
    });

    const saved = await this.usersRepo.save(user);
    const { pin: _pin, ...safe } = saved;
    return safe;
  }

  async updateUser(
    id: string,
    input: { name?: string; pin?: string; role?: string; locationIds?: string[]; active?: boolean },
  ) {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.pin) {
      const exists = await this.isPinInUse(input.pin, id);
      if (exists) {
        throw new ConflictException('PIN already in use');
      }
      user.pin = await bcrypt.hash(input.pin, 10);
    }

    if (typeof input.name === 'string') {
      user.name = input.name.trim();
    }
    if (typeof input.role === 'string') {
      user.role = input.role;
    }
    if (Array.isArray(input.locationIds)) {
      user.locationIds = input.locationIds;
    }
    if (typeof input.active === 'boolean') {
      user.active = input.active;
    }

    const saved = await this.usersRepo.save(user);
    const { pin: _pin, ...safe } = saved;
    return safe;
  }

  async deleteUser(id: string) {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepo.remove(user);
    return { ok: true };
  }

  private async findByPin(users: User[], pin: string): Promise<User | null> {
    for (const candidate of users) {
      if (this.isBcryptHash(candidate.pin)) {
        const ok = await bcrypt.compare(pin, candidate.pin);
        if (ok) {
          return candidate;
        }
      } else if (candidate.pin === pin) {
        return candidate;
      }
    }

    return null;
  }

  private isBcryptHash(value: string): boolean {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
  }

  private async isPinInUse(pin: string, exceptUserId?: string): Promise<boolean> {
    const users = await this.usersRepo.find();
    for (const candidate of users) {
      if (exceptUserId && candidate.id === exceptUserId) {
        continue;
      }

      if (this.isBcryptHash(candidate.pin)) {
        const match = await bcrypt.compare(pin, candidate.pin);
        if (match) {
          return true;
        }
      } else if (candidate.pin === pin) {
        return true;
      }
    }
    return false;
  }
}
