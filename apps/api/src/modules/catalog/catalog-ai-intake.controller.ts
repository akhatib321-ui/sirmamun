// apps/api/src/modules/catalog/catalog-ai-intake.controller.ts
import {
  Controller, Post, Param, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogAiIntakeService } from './catalog-ai-intake.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { LocationGuard } from '../../core/auth/guards/location.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserContext } from '../../shared/interfaces';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel',       // xls
  'text/csv',
  'text/plain',
];

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB hard cap to control AI token costs

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/ai-intake')
export class CatalogAiIntakeController {
  constructor(private readonly service: CatalogAiIntakeService) {}

  /**
   * POST /api/v1/catalog/ai-intake/parse/:locationId?mode=recipes|invoice
   *
   * Accepts a file upload and returns Claude's structured extraction for review.
   * Nothing is written to the database — this is preview only.
   *
   * After review, the user submits the confirmed payload to:
   *   POST /api/v1/catalog/import/json/:locationId  (recipes)
   *   POST /api/v1/catalog/import/json/:locationId  (invoice — same format, costs included)
   */
  @Roles('admin')
  @UseGuards(LocationGuard)
  @Post('parse/:locationId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  async parse(
    @Param('locationId') locationId: string,
    @Query('mode') mode: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserContext,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    if (file.buffer?.length > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `File too large. Max size is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB to control AI usage costs.`,
      );
    }

    if (mode !== 'recipes' && mode !== 'invoice') {
      throw new BadRequestException('mode must be "recipes" or "invoice"');
    }

    const mimeType = file.mimetype;
    const isAccepted = ACCEPTED_TYPES.some(t => mimeType.startsWith(t)) ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.originalname.endsWith('.pdf') ||
      file.originalname.endsWith('.txt');

    if (!isAccepted) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Upload a PDF, Excel (.xlsx), CSV, or plain text file.`
      );
    }

    return this.service.parseDocument(
      file.buffer,
      mimeType,
      file.originalname,
      mode as 'recipes' | 'invoice',
      user.organizationId,
      locationId,
    );
  }
}
