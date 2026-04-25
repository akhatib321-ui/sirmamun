import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettings } from '../entities/app-settings.entity';

const DEFAULT_CONFIG = { hiddenFields: ['supplier'] };

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(AppSettings) private repo: Repository<AppSettings>) {}

  async get(): Promise<Record<string, any>> {
    const row = await this.repo.findOneBy({ id: 1 });
    return row?.config ?? DEFAULT_CONFIG;
  }

  async update(config: Record<string, any>): Promise<Record<string, any>> {
    const existing = await this.repo.findOneBy({ id: 1 });
    if (existing) {
      await this.repo.save({ ...existing, config });
    } else {
      await this.repo.save({ id: 1, config });
    }
    return config;
  }

  async seed(): Promise<void> {
    const existing = await this.repo.findOneBy({ id: 1 });
    if (!existing) {
      await this.repo.save({ id: 1, config: DEFAULT_CONFIG });
    }
  }
}
