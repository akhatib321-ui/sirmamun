// src/modules/catalog/recipes/dto/add-recipe-ingredient.dto.ts
import { IsString, IsNumber, IsPositive, IsIn } from 'class-validator';

const VALID_UNITS = [
  'oz','ml','g','lb','kg','oz_w','shot','pump','tbsp','tsp','cup','l','each','scoop','dropper',
];

export class AddRecipeIngredientDto {
  @IsString()
  ingredientId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsIn(VALID_UNITS)
  useUnit: string; // unit used in this recipe — may differ from ingredient buy unit
}
