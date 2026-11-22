import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpRecord } from './ip-record.entity';
import { IpTrackerService } from './ip-tracker.service';
import { IpTrackerMiddleware } from './ip-tracker.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([IpRecord])],
  providers: [IpTrackerService],
  exports: [IpTrackerService],
})
export class IpTrackerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpTrackerMiddleware).forRoutes('*');
  }
}
