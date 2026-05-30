// src/modules/inventory/sales/dto/manual-match.dto.ts
import { IsString, IsUUID } from 'class-validator';

export class ManualMatchDto {
  @IsString()
  @IsUUID()
  recipeId: string;
}
