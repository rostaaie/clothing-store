import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductVariantInputDto {
  @ApiPropertyOptional({
    example: 'M',
    description: 'سایز (اختیاری، اگر محصول سایزبندی ندارد خالی بگذارید)',
  })
  @IsOptional()
  @IsString({ message: 'سایز باید متن باشد' })
  size?: string;

  @ApiPropertyOptional({
    example: 'مشکی',
    description: 'رنگ (اختیاری، اگر محصول رنگ‌بندی ندارد خالی بگذارید)',
  })
  @IsOptional()
  @IsString({ message: 'رنگ باید متن باشد' })
  color?: string;

  @ApiPropertyOptional({
    example: '#1c1e26',
    description: 'کد هگز رنگ برای نمایش نمونه (اختیاری)',
  })
  @IsOptional()
  @IsString({ message: 'کد رنگ باید متن باشد' })
  colorCode?: string;

  @ApiProperty({ example: 10, description: 'موجودی همین ترکیب سایز/رنگ' })
  @IsInt({ message: 'موجودی باید عدد صحیح باشد' })
  @Min(0, { message: 'موجودی نمی‌تواند منفی باشد' })
  @Type(() => Number)
  stock: number;
}
