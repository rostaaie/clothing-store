import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import UserRoleEnum from '../enums/userRoleEnum';

export class CreateUserDto {
  @ApiProperty({
    example: '09121234567',
    description: 'شماره موبایل ایرانی (11 رقم)',
  })
  @Matches(/^09[0-9]{9}$/, {
    message: 'شماره موبایل باید 11 رقم و با 09 شروع شود',
  })
  @Transform(({ value }) => value.trim())
  mobile: string;

  @ApiProperty({ example: 'علی احمدی', description: 'نام نمایشی' })
  @IsString({ message: 'نام باید متن باشد' })
  @IsNotEmpty({ message: 'نام الزامی است' })
  display_name: string;

  @ApiPropertyOptional({
    example: 'mySecret123',
    description: 'رمز عبور (اختیاری)',
  })
  @IsString({ message: 'رمز عبور باید متن باشد' })
  @IsOptional()
  @MinLength(3, { message: 'رمز عبور باید حداقل 3 کاراکتر باشد' })
  password: string;

  @ApiPropertyOptional({
    enum: UserRoleEnum,
    example: UserRoleEnum.NormalUser,
    description: 'نقش کاربر',
  })
  @IsEnum(UserRoleEnum, { message: 'نقش کاربر باید user یا admin باشد' })
  @IsOptional()
  role: UserRoleEnum;
}
