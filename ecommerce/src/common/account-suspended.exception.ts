import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * خطای اختصاصی برای «حساب غیرفعال‌شده‌ای که نیاز به بازیابی دارد».
 * متن پیام قابل‌خواندن برای کاربر است و کد ماشینی (code) به فرانت‌اند این امکان را
 * می‌دهد که بدون اتکا به متن فارسی، دکمه/فرم «درخواست بازیابی حساب» را نمایش دهد.
 */
export class AccountNeedsRestoreException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode: status,
        message,
        code: 'ACCOUNT_NEEDS_RESTORE',
      },
      status,
    );
  }
}
