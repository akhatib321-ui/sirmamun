// src/modules/inventory/reorder/reorder.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ReorderService } from './reorder.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { LocationGuard } from '../../../core/auth/guards/location.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../../shared/interfaces';
import { PaginationDto } from '../../../shared/pagination.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/inventory/reorder')
export class ReorderController {
  constructor(private readonly service: ReorderService) {}

  /**
   * POST /api/v1/inventory/reorder/generate/:locationId
   * Manually trigger a reorder suggestion calculation.
   */
  @Roles('admin')
  @UseGuards(LocationGuard)
  @Post('generate/:locationId')
  generate(
    @Param('locationId') locationId: string,
    @Query('windowDays') windowDays: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.generate(locationId, user, parseInt(windowDays ?? '7', 10));
  }

  /**
   * GET /api/v1/inventory/reorder/alerts/:locationId
   * Quick summary for dashboard banner — shows urgency counts.
   */
  @Roles('admin')
  @UseGuards(LocationGuard)
  @Get('alerts/:locationId')
  getAlerts(
    @Param('locationId') locationId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.getStockAlerts(locationId, user.organizationId);
  }

  /**
   * GET /api/v1/inventory/reorder/pending/:locationId
   * Latest pending suggestion with full item list — for the reorder dashboard.
   */
  @Roles('admin')
  @UseGuards(LocationGuard)
  @Get('pending/:locationId')
  getLatestPending(
    @Param('locationId') locationId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.getLatestPending(locationId, user.organizationId);
  }

  @Roles('admin')
  @UseGuards(LocationGuard)
  @Get('history/:locationId')
  findAll(
    @Param('locationId') locationId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.findAll(locationId, user.organizationId, pagination);
  }

  @Roles('admin')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.findOne(id, user.organizationId);
  }

  @Roles('admin')
  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.updateStatus(id, dto, user);
  }
}
