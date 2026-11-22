import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'موبایل و تبلت', description: 'عنوان دسته‌بندی' })
  @IsString({ message: 'عنوان دسته‌بندی باید متن باشد' })
  @IsNotEmpty({ message: 'عنوان دسته‌بندی الزامی است' })
  @MinLength(2, { message: 'عنوان دسته‌بندی باید حداقل 2 کاراکتر باشد' })
  @MaxLength(50, { message: 'عنوان دسته‌بندی باید حداکثر 50 کاراکتر باشد' })
  title: string;

  @ApiPropertyOptional({
    example: 'https://example.com/images/category.jpg',
    description: 'آدرس تصویر دسته‌بندی (URL)',
  })
  @IsString({ message: 'آدرس تصویر باید متن باشد' })
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 3,
    description:
      'آیدی دسته‌بندی والد (برای ساخت زیردسته). خالی/نال بگذارید اگر این یک دسته‌بندی سطح اول است',
  })
  @IsOptional()
  // نکته مهم: Number(null) === 0 است، پس نباید از Type(()=>Number) ساده استفاده کرد
  // وگرنه "بدون والد" (null) به‌اشتباه تبدیل به آیدی 0 می‌شود.
  @Transform(({ value }) =>
    value === null || value === undefined || value === ''
      ? null
      : Number(value),
  )
  @IsInt({ message: 'آیدی دسته‌بندی والد باید عدد صحیح باشد' })
  parentId?: number | null;
}
