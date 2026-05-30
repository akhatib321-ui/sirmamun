// src/modules/catalog/ingredients/dto/add-ingredient-cost.dto.ts
import { IsNumber, IsPositive, IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class AddIngredientCostDto {
  @IsNumber()
  @IsPositive()
  pkgSize: number;        // size of one package in ingredient's buy unit

  @IsInt()
  @Min(1)
  qtyBought: number;      // how many packages purchased

  @IsNumber()
  @IsPositive()
  totalPaid: number;      // total amount paid for entire order

  @IsDateString()
  purchaseDate: string;   // ISO date string

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  invoiceRef?: string;    // invoice number or reference for audit
}
