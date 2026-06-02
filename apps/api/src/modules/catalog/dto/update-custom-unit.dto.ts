import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

const CUSTOM_UNIT_FAMILIES = ['volume', 'weight', 'count'] as const;

export class UpdateCustomUnitDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @IsIn(CUSTOM_UNIT_FAMILIES)
  family?: (typeof CUSTOM_UNIT_FAMILIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  baseValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}