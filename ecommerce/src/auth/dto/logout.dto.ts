import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'refresh token که باید باطل شود',
  })
  @IsString({ message: 'refresh token باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن refresh token الزامی است' })
  refreshToken: string;
}
