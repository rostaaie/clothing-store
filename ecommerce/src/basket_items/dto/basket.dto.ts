import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class BasketDto {
  @ApiProperty({ example: 1, description: 'آیدی محصول برای افزودن به سبد' })
  @IsNotEmpty({ message: 'آیدی محصول الزامی است' })
  @IsInt({ message: 'آیدی محصول باید عدد صحیح باشد' })
  @Type(() => Number)
  productId: number;

  @ApiPropertyOptional({
    example: 5,
    description:
      'آیدی ترکیب سایز/رنگ انتخابی؛ اگر محصول variant دارد الزامی است',
  })
  @IsOptional()
  @IsInt({ message: 'آیدی سایز/رنگ باید عدد صحیح باشد' })
  @Type(() => Number)
  variantId?: number;

  @ApiProperty({ example: 2, description: 'تعداد محصول' })
  @IsInt({ message: 'تعداد باید عدد صحیح باشد' })
  @Min(1, { message: 'تعداد باید حداقل 1 باشد' })
  @Type(() => Number)
  quantity: number;
}
