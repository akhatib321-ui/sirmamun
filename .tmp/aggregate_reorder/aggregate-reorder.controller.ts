// apps/api/src/modules/inventory/aggregate-reorder.controller.ts
import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { AggregateReorderService } from './aggregate-reorder.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../shared/interfaces';
import { IsArray, IsString, IsOptional, IsInt, Min } from 'class-validator';

class BuildOrderDto {
  @IsArray()
  @IsString({ each: true })
  ingredientIds: string[];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/v1/inventory/reorder/aggregate')
export class AggregateReorderController {
  constructor(private readonly service: AggregateReorderService) {}

  /**
   * GET /api/v1/inventory/reorder/aggregate
   * Returns merged reorder data across all locations.
   * Reads from existing PENDING suggestions — instant, no recalculation.
   */
  @Get()
  getAggregate(@CurrentUser() user: UserContext) {
    return this.service.getAggregate(user.organizationId);
  }

  /**
   * POST /api/v1/inventory/reorder/aggregate/recalculate
   * Queues fresh reorder calculations for ALL locations.
   * Poll /aggregate after ~20 seconds to see updated data.
   */
  @Post('recalculate')
  recalculateAll(
    @Query('windowDays') windowDays: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.recalculateAll(user.organizationId, parseInt(windowDays ?? '7', 10));
  }

  /**
   * POST /api/v1/inventory/reorder/aggregate/build-order
   * Body: { ingredientIds: string[] }
   * Returns supplier-grouped order data with per-location breakdown.
   * Used by the combined order list UI.
   */
  @Post('build-order')
  buildOrder(@Body() dto: BuildOrderDto, @CurrentUser() user: UserContext) {
    return this.service.buildCombinedOrder(user.organizationId, dto.ingredientIds);
  }
}
