import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestoreRequest } from './entities/restore-request.entity';
import { RestoreRequestService } from './restore-request.service';
import { RestoreRequestController } from './restore-request.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([RestoreRequest]), UsersModule],
  controllers: [RestoreRequestController],
  providers: [RestoreRequestService],
})
export class RestoreRequestModule {}
