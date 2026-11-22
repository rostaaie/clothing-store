import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import UserRoleEnum from '../enums/userRoleEnum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'رضا رضایی', description: 'نام نمایشی جدید' })
  @Expose()
  @IsString({ message: 'نام باید متن باشد' })
  @IsNotEmpty({ message: 'نام نمی‌تواند خالی باشد' })
  display_name: string;

  @ApiPropertyOptional({
    enum: UserRoleEnum,
    example: UserRoleEnum.Admin,
    description: 'تغییر نقش کاربر',
  })
  @Expose()
  @IsEnum(UserRoleEnum, { message: 'نقش کاربر باید user یا admin باشد' })
  @IsOptional()
  role: UserRoleEnum;
}
