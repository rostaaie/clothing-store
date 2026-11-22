import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDiscountCodeDto {
  @ApiProperty({
    example: 'SUMMER2024',
    description: 'کد تخفیف (حروف و اعداد)',
  })
  @IsString({ message: 'کد تخفیف باید متن باشد' })
  @MinLength(3, { message: 'کد تخفیف باید حداقل 3 کاراکتر باشد' })
  code: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'درصد تخفیف (1 تا 100) - یا amount را وارد کنید',
  })
  @IsOptional()
  @IsInt({ message: 'درصد تخفیف باید عدد صحیح باشد' })
  @Min(1, { message: 'درصد تخفیف باید حداقل 1 باشد' })
  @Type(() => Number)
  percent?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'مبلغ تخفیف به تومان - یا percent را وارد کنید',
  })
  @IsOptional()
  @IsInt({ message: 'مبلغ تخفیف باید عدد صحیح باشد' })
  @Min(1000, { message: 'مبلغ تخفیف باید حداقل 1000 تومان باشد' })
  @Type(() => Number)
  amount?: number;

  @ApiProperty({ example: 100, description: 'حداکثر تعداد استفاده از کد' })
  @IsInt({ message: 'حداکثر استفاده باید عدد صحیح باشد' })
  @Min(0, { message: 'حداکثر استفاده نمی‌تواند منفی باشد' })
  @Type(() => Number)
  maxUsage: number;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'تاریخ انقضا (تاریخ ساده یا ISO 8601 هر دو قابل‌قبول است)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return value;
    // اگر از قبل یک رشته معتبر ISO باشد یا یک تاریخ ساده (مثل 2024-12-31)، آن را به ISO کامل تبدیل می‌کنیم
    const date = new Date(value);
    if (isNaN(date.getTime())) return value; // نامعتبر بود؛ بگذار IsDateString خطای واضح بدهد
    return date.toISOString();
  })
  @IsDateString({}, { message: 'تاریخ انقضا معتبر نیست' })
  expireAt?: Date;

  @ApiPropertyOptional({
    example: 200000,
    description: 'حداقل مبلغ خرید برای استفاده از کد',
  })
  @IsOptional()
  @IsInt({ message: 'حداقل خرید باید عدد صحیح باشد' })
  @Min(0, { message: 'حداقل خرید نمی‌تواند منفی باشد' })
  @Type(() => Number)
  minPurchaseAmount?: number;
}
