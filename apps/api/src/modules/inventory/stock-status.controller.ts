import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { UserContext } from '../../shared/interfaces';
import { StockStatusService } from './stock-status.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('inventory/stock-status')
export class StockStatusController {
  constructor(private readonly service: StockStatusService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: UserContext,
    @Query('windowDays') windowDays?: string,
  ) {
    const parsed = Number.parseInt(windowDays ?? '7', 10);
    return this.service.getSummary(
      user.organizationId,
      Number.isFinite(parsed) ? parsed : 7,
    );
  }

  @Get()
  getStatus(
    @CurrentUser() user: UserContext,
    @Query('windowDays') windowDays?: string,
  ) {
    const parsed = Number.parseInt(windowDays ?? '7', 10);
    return this.service.getStatus(
      user.organizationId,
      Number.isFinite(parsed) ? parsed : 7,
    );
  }
}
