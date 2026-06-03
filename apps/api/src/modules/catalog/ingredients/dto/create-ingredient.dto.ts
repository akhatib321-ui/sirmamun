// src/modules/catalog/ingredients/dto/create-ingredient.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @IsOptional()
  @IsNumber()
  purchaseToBase?: number;
}
