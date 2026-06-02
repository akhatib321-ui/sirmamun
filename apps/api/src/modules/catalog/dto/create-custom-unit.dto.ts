import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

const CUSTOM_UNIT_FAMILIES = ['volume', 'weight', 'count'] as const;

export class CreateCustomUnitDto {
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'name must be lowercase and use only letters, numbers, and underscores',
  })
  name: string;

  @IsString()
  label: string;

  @IsString()
  @IsIn(CUSTOM_UNIT_FAMILIES)
  family: (typeof CUSTOM_UNIT_FAMILIES)[number];

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  baseValue: number;

  @IsOptional()
  @IsString()
  notes?: string;
}