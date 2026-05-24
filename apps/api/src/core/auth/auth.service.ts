import { Injectable, UnauthorizedException } from '@nestjs/common';
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
}
