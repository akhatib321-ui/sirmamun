// src/modules/catalog/recipes/dto/create-recipe.dto.ts
import { IsString, IsNumber, IsOptional, IsBoolean, IsPositive } from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sellPrice?: number;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
