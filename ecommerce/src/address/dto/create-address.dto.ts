import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'تهران', description: 'استان' })
  @IsString({ message: 'استان باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن استان الزامی است' })
  province: string;

  @ApiProperty({ example: 'تهران', description: 'شهر' })
  @IsString({ message: 'شهر باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن شهر الزامی است' })
  city: string;

  @ApiProperty({ example: 'خیابان ولیعصر، پلاک 12', description: 'آدرس دقیق' })
  @IsString({ message: 'آدرس باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن آدرس الزامی است' })
  adress: string;

  @ApiProperty({ example: '1234567890', description: 'کد پستی (دقیقا 10 رقم)' })
  @IsString({ message: 'کد پستی باید متن باشد' })
  @Length(10, 10, { message: 'کد پستی باید دقیقا 10 رقم باشد' })
  @IsNotEmpty({ message: 'وارد کردن کد پستی الزامی است' })
  @Transform(({ value }) => value?.trim())
  postal_code: string;

  @ApiProperty({
    example: '09123456789',
    description: 'شماره موبایل گیرنده (دقیقا 11 رقم)',
  })
  @IsString({ message: 'شماره موبایل باید متن باشد' })
  @Length(11, 11, { message: 'شماره موبایل باید دقیقا 11 رقم باشد' })
  @IsNotEmpty({ message: 'وارد کردن شماره موبایل گیرنده الزامی است' })
  @Transform(({ value }) => value?.trim())
  reciver_mobile: string;

  @ApiPropertyOptional({
    example: 'لطفا بعد از ساعت 5 عصر تحویل بدهید',
    description: 'توضیحات تکمیلی آدرس',
  })
  @IsString({ message: 'توضیحات باید متن باشد' })
  @IsOptional()
  description?: string;
}
