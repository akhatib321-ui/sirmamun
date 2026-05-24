import { Controller, Get } from '@nestjs/common';
import { Public } from './core/auth/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'api',
      ts: new Date().toISOString(),
    };
  }
}
