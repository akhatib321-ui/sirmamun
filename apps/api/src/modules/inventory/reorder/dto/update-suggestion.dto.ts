// src/modules/inventory/reorder/dto/update-suggestion.dto.ts
import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateSuggestionDto {
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'ORDERED', 'DISMISSED'])
  status: 'PENDING' | 'APPROVED' | 'ORDERED' | 'DISMISSED';

  @IsOptional()
  @IsString()
  notes?: string;
}
