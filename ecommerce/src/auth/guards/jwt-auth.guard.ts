import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // روت عمومی است: اگر توکن ارسال شده، آن را اعتبارسنجی کن
      // (تا req.user ست شود برای عملیات اختیاری مثل trackView)
      // اگر توکنی نبود، مستقیم اجازه بده بدون احراز هویت
      const request = context.switchToHttp().getRequest();
      if (!request.headers.authorization) return true;
      // توکن وجود دارد → passport اجرا شود ولی خطا ندهد
      return super.canActivate(context);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // روت عمومی: اگر کاربر معتبر بود برگردان، وگرنه undefined (بدون خطا)
      return user || undefined;
    }

    // روت محافظت‌شده: اگر کاربر نبود خطا بده
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('شما وارد نشده‌اید یا توکن نامعتبر است')
      );
    }
    return user;
  }
}
