import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: '09121234567',
    description: 'شماره موبایل ایرانی (11 رقم، شروع با 09)',
  })
  @Matches(/^09[0-9]{9}$/, {
    message: 'شماره موبایل باید 11 رقم و با 09 شروع شود',
  })
  @Transform(({ value }) => value.trim())
  mobile: string;

  @ApiProperty({
    example: 'علی احمدی',
    description: 'نام نمایشی (2 تا 16 کاراکتر)',
  })
  @IsString({ message: 'نام باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن نام الزامی است' })
  @MinLength(2, { message: 'نام باید حداقل 2 کاراکتر باشد' })
  @MaxLength(16, { message: 'نام باید حداکثر 16 کاراکتر باشد' })
  display_name: string;

  @ApiProperty({
    example: 'mySecret123',
    description: 'رمز عبور (3 تا 16 کاراکتر)',
  })
  @IsString({ message: 'رمز عبور باید متن باشد' })
  @MinLength(3, { message: 'رمز عبور باید حداقل 3 کاراکتر باشد' })
  @MaxLength(16, { message: 'رمز عبور باید حداکثر 16 کاراکتر باشد' })
  password: string;
}
