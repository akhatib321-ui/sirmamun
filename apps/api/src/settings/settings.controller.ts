import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get()
  get() { return this.svc.get(); }

  @Put()
  update(@Body() body: Record<string, any>) { return this.svc.update(body); }
}
