import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async login(pin: string) {
    const user = await this.repo.findOneBy({ pin });
    if (!user) throw new UnauthorizedException('Invalid PIN');
    // Never return the PIN to the client
    const { pin: _, ...safe } = user;
    return safe;
  }

  async listUsers() {
    const users = await this.repo.find({ order: { createdAt: 'ASC' } });
    return users.map(({ pin: _, ...u }) => u);
  }

  async createUser(name: string, pin: string, role: string = 'staff', locationIds: string[] = []) {
    const existing = await this.repo.findOneBy({ pin });
    if (existing) throw new UnauthorizedException('PIN already in use');
    const user = await this.repo.save(this.repo.create({ name, pin, role, locationIds }));
    const { pin: _, ...safe } = user;
    return safe;
  }

  async updateUser(id: string, dto: { name?: string; pin?: string; role?: string; locationIds?: string[] }) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException();
    // Check PIN uniqueness if changing
    if (dto.pin && dto.pin !== user.pin) {
      const conflict = await this.repo.findOneBy({ pin: dto.pin });
      if (conflict) throw new UnauthorizedException('PIN already in use');
    }
    const updated = await this.repo.save({ ...user, ...dto });
    const { pin: _, ...safe } = updated;
    return safe;
  }

  async deleteUser(id: string) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException();
    await this.repo.remove(user);
    return { ok: true };
  }

  // Seed a default admin on first boot if no users exist
  async seedAdmin() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(this.repo.create({ name: 'Admin', pin: '0000', role: 'admin' }));
      console.log('Seeded default admin — PIN: 0000. Change this immediately.');
    }
  }
}
