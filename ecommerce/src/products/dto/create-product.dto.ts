import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductVariantInputDto } from './product-variant-input.dto';

export class CreateProductDto {
  @ApiProperty({
    example: 'گوشی سامسونگ Galaxy A54',
    description: 'عنوان محصول',
  })
  @IsString({ message: 'عنوان باید متن باشد' })
  @IsNotEmpty({ message: 'عنوان محصول الزامی است' })
  @MinLength(3, { message: 'عنوان باید حداقل 3 کاراکتر باشد' })
  title: string;

  @ApiProperty({
    example: 'گوشی هوشمند با دوربین 50 مگاپیکسل و باتری 5000 میلی‌آمپر',
    description: 'توضیحات محصول',
  })
  @IsString({ message: 'توضیحات باید متن باشد' })
  @IsNotEmpty({ message: 'توضیحات محصول الزامی است' })
  description: string;

  @ApiProperty({ example: 12500000, description: 'قیمت به تومان' })
  @IsInt({ message: 'قیمت باید عدد صحیح باشد' })
  @Min(0, { message: 'قیمت نمی‌تواند منفی باشد' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    example: 100,
    description:
      'موجودی انبار (فقط برای محصولات ساده بدون سایز/رنگ؛ اگر variants ارسال شود نادیده گرفته می‌شود)',
  })
  @IsInt({ message: 'موجودی باید عدد صحیح باشد' })
  @Min(0, { message: 'موجودی نمی‌تواند منفی باشد' })
  @Type(() => Number)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({
    type: [ProductVariantInputDto],
    description:
      'ترکیب‌های سایز/رنگ محصول و موجودی هرکدام (اختیاری). اگر ارسال شود، موجودی کل محصول از جمع این‌ها محاسبه می‌شود.',
  })
  @IsOptional()
  @IsArray({ message: 'variants باید آرایه باشد' })
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];

  @ApiPropertyOptional({
    example: [1, 3],
    description: 'آیدی دسته‌بندی‌های مرتبط با محصول',
    type: [Number],
  })
  @IsArray({ message: 'دسته‌بندی‌ها باید آرایه باشند' })
  @IsInt({ each: true, message: 'هر آیدی دسته‌بندی باید عدد صحیح باشد' })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({
    example: 'https://example.com/images/product.jpg',
    description: 'آدرس تصویر محصول (URL)',
  })
  @IsString({ message: 'آدرس تصویر باید متن باشد' })
  @IsOptional()
  imageUrl?: string;
}
