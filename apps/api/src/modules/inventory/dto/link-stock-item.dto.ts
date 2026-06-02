import { ValidateIf, IsString } from 'class-validator';

export class LinkStockItemDto {
  @ValidateIf((_, value) => value !== null)
  @IsString()
  stockItemId: string | null;
}