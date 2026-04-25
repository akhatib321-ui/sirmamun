import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { Item } from './entities/item.entity';
import { Stock } from './entities/stock.entity';
import { Log } from './entities/log.entity';
import { User } from './entities/user.entity';
import { AppSettings } from './entities/app-settings.entity';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { LocationsModule } from './locations/locations.module';
import { ItemsModule } from './items/items.module';
import { StockModule } from './stock/stock.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { AuthService } from './auth/auth.service';
import { SettingsService } from './settings/settings.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'sirmamun',
      entities: [Location, Item, Stock, Log, User, AppSettings],
      synchronize: true,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
    BootstrapModule,
    LocationsModule,
    ItemsModule,
    StockModule,
    AuthModule,
    SettingsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private authService: AuthService, private settingsService: SettingsService) {}
  async onModuleInit() {
    await this.authService.seedAdmin();
    await this.settingsService.seed();
  }
}
