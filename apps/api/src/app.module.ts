import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { LocationsModule } from './locations/locations.module';
import { ItemsModule } from './items/items.module';
import { StockModule } from './stock/stock.module';
import { AuthModule } from './core/auth/auth.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { AuthService } from './core/auth/auth.service';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { RolesGuard } from './core/auth/guards/roles.guard';
import { SettingsService } from './settings/settings.service';
import { HealthController } from './health.controller';
import { JobsModule } from './jobs/jobs.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', ignoreErrors: true }),
    PrismaModule,
    BootstrapModule,
    LocationsModule,
    ItemsModule,
    StockModule,
    AuthModule,
    SettingsModule,
    JobsModule,
    CatalogModule,
    InventoryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule implements OnModuleInit {
  constructor(private authService: AuthService, private settingsService: SettingsService) {}
  async onModuleInit() {
    await this.authService.seedAdmin();
    await this.settingsService.seed();
  }
}
