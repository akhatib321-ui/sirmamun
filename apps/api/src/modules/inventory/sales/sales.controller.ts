// src/modules/inventory/sales/sales.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { LocationGuard } from '../../../core/auth/guards/location.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../../shared/interfaces';
import { PaginationDto } from '../../../shared/pagination.dto';
import { ManualMatchDto } from './dto/manual-match.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  /**
   * POST /api/v1/inventory/sales/import/:locationId
   * Multipart form: file (CSV), reportDate (YYYY-MM-DD)
   */
  @Roles('admin')
  @UseGuards(LocationGuard)
  @Post('import/:locationId')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @Param('locationId') locationId: string,
    @Query('reportDate') reportDate: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserContext,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!reportDate) throw new BadRequestException('reportDate query param required (YYYY-MM-DD)');
    return this.service.importCsv(file.buffer, locationId, reportDate, user);
  }

  @Roles('admin')
  @UseGuards(LocationGuard)
  @Get(':locationId')
  findAll(
    @Param('locationId') locationId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.findAll(locationId, user.organizationId, pagination);
  }

  @Roles('admin')
  @Get('reports/:reportId/unmatched')
  getUnmatched(
    @Param('reportId') reportId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.getUnmatchedItems(reportId, user.organizationId);
  }

  /**
   * PATCH /api/v1/inventory/sales/items/:itemId/match
   * Admin manually matches an unmatched Toast item to a recipe.
   */
  @Roles('admin')
  @Patch('items/:itemId/match')
  manualMatch(
    @Param('itemId') itemId: string,
    @Body() dto: ManualMatchDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.manualMatch(itemId, dto, user);
  }
}
