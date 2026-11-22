import { Controller, Get, Patch, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetUser } from 'src/decorators/get-user.decorator';

// این کنترلر به‌جای UsersController (که فقط برای ادمین است) برای خودِ کاربر لاگین‌شده است
// هیچ @Roles ای روی این کنترلر تعریف نشده، پس هر کاربر لاگین‌شده‌ای (نه فقط ادمین) به آن دسترسی دارد
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users/me')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت پروفایل خود کاربر لاگین‌شده' })
  async getMyProfile(@GetUser('id') userId: number) {
    const user = await this.usersService.getMyProfile(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'پروفایل دریافت شد',
      data: user,
    };
  }

  @Patch()
  @ApiOperation({
    summary: 'ویرایش نام نمایشی خود کاربر (شماره موبایل قابل ویرایش نیست)',
  })
  async updateMyProfile(
    @GetUser('id') userId: number,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateMyProfile(
      userId,
      updateProfileDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'پروفایل ویرایش شد',
      data: user,
    };
  }

  @Patch('password')
  @ApiOperation({ summary: 'تغییر رمز عبور خود کاربر (با رمز عبور فعلی)' })
  async changeMyPassword(
    @GetUser('id') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.usersService.changeMyPassword(
      userId,
      changePasswordDto,
    );
    return { statusCode: HttpStatus.OK, message: result.message };
  }
}
