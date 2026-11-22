import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '09121234567',
    description: 'شماره موبایل (11 رقم، شروع با 09)',
  })
  @Matches(/^09[0-9]{9}$/, {
    message: 'شماره موبایل باید 11 رقم و با 09 شروع شود',
  })
  @Transform(({ value }) => value.trim())
  mobile: string;

  @ApiProperty({ example: 'mySecret123', description: 'رمز عبور' })
  @IsString({ message: 'رمز عبور باید متن باشد' })
  @MinLength(3, { message: 'رمز عبور باید حداقل 3 کاراکتر باشد' })
  @MaxLength(16, { message: 'رمز عبور باید حداکثر 16 کاراکتر باشد' })
  password: string;
}
