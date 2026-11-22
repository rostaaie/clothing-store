import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.sevice';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from 'src/decorators/public.decorator';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر جدید' })
  async register(@Body() registerDto: RegisterDto) {
    const register = await this.authService.register(
      registerDto.mobile,
      registerDto.password,
      registerDto.display_name,
    );
    return {
      statusCode: HttpStatus.CREATED,
      data: register,
      message: 'ثبت‌نام با موفقیت انجام شد',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ورود به سیستم و دریافت توکن JWT و refresh توکن' })
  async login(@Body() loginDto: LoginDto) {
    const login = await this.authService.login(
      loginDto.mobile,
      loginDto.password,
    );
    return {
      statusCode: HttpStatus.OK,
      data: login,
      message: 'ورود با موفقیت انجام شد',
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تازه‌سازی access token با refresh token (rotation امن)',
  })
  async refresh(@Body() refreshDto: RefreshDto, @Req() req: Request) {
    const ip = this.clientIp(req);
    const result = await this.authService.refresh(refreshDto.refreshToken, ip);
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: 'توکن با موفقیت تازه‌سازی شد',
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'خروج و باطل‌کردن refresh token' })
  async logout(@Body() logoutDto: LogoutDto) {
    const result = await this.authService.logout(logoutDto.refreshToken);
    return { statusCode: HttpStatus.OK, data: result, message: result.message };
  }

  private clientIp(req: Request): string | undefined {
    const xForwarded = req.headers['x-forwarded-for'];
    if (typeof xForwarded === 'string') return xForwarded.split(',')[0].trim();
    return req.socket?.remoteAddress;
  }
}
