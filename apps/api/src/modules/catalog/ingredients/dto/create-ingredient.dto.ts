// src/modules/catalog/ingredients/dto/create-ingredient.dto.ts
import { IsString, IsOptional, IsIn } from 'class-validator';

const VALID_UNITS = [
  'oz','ml','g','lb','kg','oz_w','shot','pump','tbsp','tsp','cup','l','each','scoop','dropper',
];

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(VALID_UNITS)
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
