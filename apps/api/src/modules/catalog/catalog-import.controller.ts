import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogImportService } from './catalog-import.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { LocationGuard } from '../../core/auth/guards/location.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../shared/interfaces';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/import')
export class CatalogImportController {
  constructor(private readonly service: CatalogImportService) {}

  @Roles('admin')
  @UseGuards(LocationGuard)
  @Post('json/:locationId')
  importJson(
    @Param('locationId') locationId: string,
    @Body() payload: any,
    @CurrentUser() user: UserContext,
  ) {
    if (!payload?.ingredients && !payload?.recipes) {
      throw new BadRequestException(
        'Invalid import format. Expected { ingredients: [...], recipes: [...] }',
      );
    }
    return this.service.importJson(payload, locationId, user);
  }

  @Roles('admin')
  @UseGuards(LocationGuard)
  @Post('ingredients-csv/:locationId')
  @UseInterceptors(FileInterceptor('file'))
  importIngredientsCsv(
    @Param('locationId') locationId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserContext,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.importIngredientsCsv(file.buffer, locationId, user);
  }
}
