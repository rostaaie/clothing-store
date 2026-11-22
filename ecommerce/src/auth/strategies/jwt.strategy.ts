import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { userCache } from 'src/common/user-cache';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET_KEY'),
    });
  }
  async validate(payload: any) {
    // کش: کوئری دیتابیس فقط هر ۵ دقیقه یکبار انجام می‌شود
    // اگر کاربر soft-delete یا نقشش تغییر کند، حداکثر ۵ دقیقه تأخیر دارد
    const cacheKey = `user:${payload.sub}`;
    const cached = userCache.get<{
      id: number;
      mobile: string;
      display_name: string;
      role: string;
    }>(cacheKey);

    if (cached) return cached;

    let user;
    try {
      user = await this.usersService.getMyProfile(payload.sub);
    } catch {
      // کاربر حذف شده → کش را هم پاک کن تا بعداً دوباره چک نشود
      userCache.invalidate(cacheKey);
      throw new UnauthorizedException('کاربر یافت نشد یا حسابش حذف شده است');
    }

    const result = {
      id: user.id,
      mobile: user.mobile,
      display_name: user.display_name,
      role: user.role,
    };

    userCache.set(cacheKey, result);

    return result;
  }
}
