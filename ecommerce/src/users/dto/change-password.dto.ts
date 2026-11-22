import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentSecret123', description: 'رمز عبور فعلی' })
  @IsString({ message: 'رمز عبور فعلی باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن رمز عبور فعلی الزامی است' })
  currentPassword: string;

  @ApiProperty({ example: 'newSecret456', description: 'رمز عبور جدید' })
  @IsString({ message: 'رمز عبور جدید باید متن باشد' })
  @IsNotEmpty({ message: 'وارد کردن رمز عبور جدید الزامی است' })
  @MinLength(3, { message: 'رمز عبور جدید باید حداقل 3 کاراکتر باشد' })
  newPassword: string;
}
