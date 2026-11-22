import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IpTrackerService } from './ip-tracker.service';

@Injectable()
export class IpTrackerMiddleware implements NestMiddleware {
  constructor(private readonly ipTrackerService: IpTrackerService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      req.ip ??
      'unknown';

    const isBlocked = await this.ipTrackerService.handleRequest(ip);

    if (isBlocked) {
      throw new HttpException(
        'Too many requests. You are temporarily blocked.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
