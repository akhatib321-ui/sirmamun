import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

const DEFAULT_CONFIG = { hiddenFields: ['supplier'] };

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<Record<string, any>> {
    const row = await this.prisma.appSettings.findUnique({ where: { id: 1 } });
    return row ? this.prisma.parseJson<Record<string, any>>(row.config, DEFAULT_CONFIG) : DEFAULT_CONFIG;
  }

  async update(config: Record<string, any>): Promise<Record<string, any>> {
    const existing = await this.prisma.appSettings.findUnique({ where: { id: 1 } });
    const serialized = this.prisma.serializeJson(config);

    if (existing) {
      await this.prisma.appSettings.update({
        where: { id: 1 },
        data: { config: serialized },
      });
    } else {
      await this.prisma.appSettings.create({
        data: { id: 1, config: serialized },
      });
    }

    return config;
  }

  async seed(): Promise<void> {
    const existing = await this.prisma.appSettings.findUnique({ where: { id: 1 } });
    if (!existing) {
      await this.prisma.appSettings.create({
        data: { id: 1, config: this.prisma.serializeJson(DEFAULT_CONFIG) },
      });
    }
  }
}
