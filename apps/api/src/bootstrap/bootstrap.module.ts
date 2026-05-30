import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
