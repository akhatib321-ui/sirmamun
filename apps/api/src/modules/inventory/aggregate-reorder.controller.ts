import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AggregateReorderService } from './aggregate-reorder.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../shared/interfaces';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('inventory/reorder/aggregate')
export class AggregateReorderController {
  constructor(private readonly service: AggregateReorderService) {}

  @Get()
  getAggregate(@CurrentUser() user: UserContext) {
    return this.service.getAggregate(user.organizationId);
  }

  @Post('recalculate')
  recalculateAll(
    @Query('windowDays') windowDays: string,
    @CurrentUser() user: UserContext,
  ) {
    const parsed = Number.parseInt(windowDays ?? '7', 10);
    return this.service.recalculateAll(user.organizationId, Number.isFinite(parsed) ? parsed : 7);
  }

  @Post('build-order')
  buildOrder(
    @Body() payload: { ingredientIds?: string[] },
    @CurrentUser() user: UserContext,
  ) {
    if (!Array.isArray(payload?.ingredientIds) || !payload.ingredientIds.every((v) => typeof v === 'string')) {
      throw new BadRequestException('Body must include ingredientIds: string[]');
    }

    return this.service.buildCombinedOrder(user.organizationId, payload.ingredientIds);
  }

  @Post('mark-ordered')
  markOrdered(
    @Body() payload: {
      supplierId?: string;
      deliveryLocationId?: string | null;
      expectedAt?: string | null;
      items?: any[];
    },
    @CurrentUser() user: UserContext,
  ) {
    return this.service.markCombinedOrder(user.organizationId, user.sub, {
      supplierId: payload.supplierId || '',
      deliveryLocationId: payload.deliveryLocationId,
      expectedAt: payload.expectedAt,
      items: Array.isArray(payload.items) ? payload.items as any : [],
    });
  }
}
