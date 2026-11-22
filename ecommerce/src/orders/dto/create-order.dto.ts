import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsInt()
  @Type(() => Number)
  addressId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  discountCodeId?: number;
}
