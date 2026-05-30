// src/modules/inventory/suppliers/dto/create-supplier.dto.ts
import { IsString, IsIn, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['OPERATIONAL', 'DOMESTIC_BULK', 'OVERSEAS_BULK'])
  type: 'OPERATIONAL' | 'DOMESTIC_BULK' | 'OVERSEAS_BULK';

  @IsInt()
  @Min(1)
  leadTimeDays: number; // business days from order to delivery

  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(3.0)
  safetyFactor?: number; // default 1.3 — how much buffer to add beyond lead time

  @IsOptional()
  @IsString()
  notes?: string;
}
