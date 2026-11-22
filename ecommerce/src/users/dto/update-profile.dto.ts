import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'رضا رضایی', description: 'نام نمایشی جدید' })
  @IsString({ message: 'نام باید متن باشد' })
  @IsNotEmpty({ message: 'نام نمی‌تواند خالی باشد' })
  @MinLength(2, { message: 'نام باید حداقل 2 کاراکتر باشد' })
  @MaxLength(16, { message: 'نام باید حداکثر 16 کاراکتر باشد' })
  display_name: string;
}
