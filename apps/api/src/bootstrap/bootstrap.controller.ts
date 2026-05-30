import { Controller, Get } from '@nestjs/common';
import { Public } from '../core/auth/decorators/public.decorator';
import { PrismaService } from '../core/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Controller('bootstrap')
export class BootstrapController {
  constructor(
    private readonly prisma: PrismaService,
    private settingsSvc: SettingsService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'api',
      ts: new Date().toISOString(),
    };
  }

  @Get()
  async bootstrap() {
    const [locations, items, stock, logs, settings] = await Promise.all([
      this.prisma.location.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.item.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.stock.findMany(),
      this.prisma.log.findMany({ orderBy: { ts: 'desc' }, take: 300 }),
      this.settingsSvc.get(),
    ]);

    const log = logs.map((entry) => ({
      ...entry,
      ts: Number(entry.ts),
    }));

    return { locations, items, stock, log, settings };
  }
}
