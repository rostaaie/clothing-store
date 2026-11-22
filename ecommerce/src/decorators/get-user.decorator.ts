import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * دکوریتور برای گرفتن اطلاعات کاربر لاگین‌شده از توکن JWT
 * مثال: @GetUser() user  =>  کل آبجکت کاربر
 * مثال: @GetUser('id') userId  =>  فقط id کاربر
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
