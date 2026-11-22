import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'refresh token دریافتی از پاسخ ورود',
  })
  @IsString({ message: 'refresh token باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن refresh token الزامی است' })
  refreshToken: string;
}
