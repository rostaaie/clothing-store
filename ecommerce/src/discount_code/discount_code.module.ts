import { Module } from '@nestjs/common';
import { DiscountCodeService } from './discount_code.service';
import { DiscountCodeController } from './discount_code.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountCode } from './entities/discount_code.entity';
import { Order } from 'src/orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiscountCode, Order])],
  controllers: [DiscountCodeController],
  providers: [DiscountCodeService],
  exports: [DiscountCodeService],
})
export class DiscountCodeModule {}
