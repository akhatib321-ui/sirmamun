import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { UserContext } from '../../shared/interfaces';
import { LinkStockItemDto } from './dto/link-stock-item.dto';
import { StockChainService } from './stock-chain.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/stock-chain')
export class StockChainController {
  constructor(private readonly service: StockChainService) {}

  @Get('items')
  getStockItems() {
    return this.service.getStockItems();
  }

  @Get('resolve/:ingredientId')
  resolveChain(
    @Param('ingredientId') ingredientId: string,
    @Query('locationId') locationId: string | undefined,
    @Query('stockItemId') stockItemId: string | undefined,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.resolveChain(
      ingredientId,
      locationId ?? null,
      user.organizationId,
      stockItemId ?? null,
    );
  }

  @Roles('admin')
  @Post('link/:ingredientId')
  link(
    @Param('ingredientId') ingredientId: string,
    @Body() dto: LinkStockItemDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.linkIngredient(ingredientId, dto.stockItemId, user.organizationId);
  }

  @Roles('admin')
  @Delete('link/:ingredientId')
  unlink(@Param('ingredientId') ingredientId: string, @CurrentUser() user: UserContext) {
    return this.service.linkIngredient(ingredientId, null, user.organizationId);
  }
}