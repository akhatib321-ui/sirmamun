import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps PrismaClient for NestJS lifecycle management.
 * Registered as @Global() in PrismaModule so it can be injected
 * anywhere without importing PrismaModule in each feature module.
 *
 * Usage in any service:
 *   constructor(private readonly prisma: PrismaService) {}
 *   const users = await this.prisma.user.findMany();
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Helper for parsing TEXT columns that were stored as JSON
   * by TypeORM's simple-json (AppSettings.config, User.locationIds).
   * Returns the parsed value, or the fallback if parsing fails.
   */
  parseJson<T>(raw: string, fallback: T): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Helper for serializing values back to TEXT for simple-json columns.
   */
  serializeJson(value: unknown): string {
    return JSON.stringify(value);
  }
}
