import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpRecord } from './ip-record.entity';
import { DateTime } from 'luxon';

@Injectable()
export class IpTrackerService {
  constructor(
    @InjectRepository(IpRecord)
    private readonly ipRepo: Repository<IpRecord>,
  ) {}

  async handleRequest(ip: string): Promise<boolean> {
    const now = DateTime.utc();

    let record = await this.ipRepo.findOne({ where: { ip } });

    if (!record) {
      record = this.ipRepo.create({
        ip,
        requestCount: 1,
        windowStart: now.toJSDate(),
        windowEnd: now.plus({ minutes: 1 }).toJSDate(),
        isBlocked: false,
      });

      await this.ipRepo.save(record);
      return false;
    }

    const blockedUntil = record.blockedUntil
      ? DateTime.fromJSDate(record.blockedUntil)
      : null;

    if (record.isBlocked && blockedUntil && blockedUntil > now) {
      return true;
    }

    if (record.isBlocked && blockedUntil && blockedUntil <= now) {
      record.isBlocked = false;
      record.requestCount = 0;
      record.blockedUntil = null;
    }

    const windowEnd = DateTime.fromJSDate(record.windowEnd);

    if (now > windowEnd) {
      record.requestCount = 1;
      record.windowStart = now.toJSDate();
      record.windowEnd = now.plus({ minutes: 1 }).toJSDate();
    } else {
      record.requestCount += 1;
    }

    if (record.requestCount > 60) {
      record.isBlocked = true;
      record.blockedUntil = now.plus({ minutes: 10 }).toJSDate();
    }

    await this.ipRepo.save(record);

    return record.isBlocked;
  }
}
