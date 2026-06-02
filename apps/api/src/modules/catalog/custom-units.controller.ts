import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { UserContext } from '../../shared/interfaces';
import { CreateCustomUnitDto } from './dto/create-custom-unit.dto';
import { UpdateCustomUnitDto } from './dto/update-custom-unit.dto';
import { CustomUnitsService } from './custom-units.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/custom-units')
export class CustomUnitsController {
  constructor(private readonly service: CustomUnitsService) {}

  @Get()
  findAll(@CurrentUser() user: UserContext) {
    return this.service.findAll(user.organizationId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCustomUnitDto, @CurrentUser() user: UserContext) {
    return this.service.create(dto, user);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomUnitDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.service.remove(id, user);
  }
}