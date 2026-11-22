import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

type AuthedRequest = Request & {
  user?: { id?: string | number };
  requestId?: string;
  //درصورت وجود ریکوئست ایدی هم میگیریم
};

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: AuthedRequest, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    // request id
    const requestId = randomUUID();
    req.requestId = requestId;

    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const method = req.method;
    const url = req.originalUrl || req.url;
    const userAgent = req.get('user-agent') || '-';

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const statusCode = res.statusCode;
      const userId = req.user?.id ?? 'guest';

      const logPayload = {
        requestId,
        method,
        url,
        statusCode,
        duration: Number(durationMs.toFixed(1)),
        ip,
        userAgent,
        userId,
        timestamp: new Date().toISOString(),
      };

      // smart log level
      //چون در سیستم‌های مانیتورینگ:
      //  لول  ERROR سریعاً الرت می‌دهد
      // و WARN نشان‌دهنده مشکل کاربر است
      // و LOG فقط اطلاعات عادی است
      //خروجی:
      //[Nest] LOG [HTTP] {...}
      //[Nest] WARN [HTTP] {...}
      //[Nest] ERROR [HTTP] {...}

      if (statusCode >= 500) {
        this.logger.error(JSON.stringify(logPayload));
      } else if (statusCode >= 400) {
        this.logger.warn(JSON.stringify(logPayload));
      } else {
        this.logger.log(JSON.stringify(logPayload));
      }
    });

    next();
  }
}
