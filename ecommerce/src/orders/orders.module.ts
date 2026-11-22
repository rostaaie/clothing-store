import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentModule } from '../payment/payment.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { BasketItem } from 'src/basket_items/entities/basket_item.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
import { DiscountCode } from 'src/discount_code/entities/discount_code.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { WalletTransaction } from 'src/wallet/entities/wallet-transaction.entity';
import { User } from 'src/users/entities/user.entity';
import { Address } from 'src/address/entities/address.entity';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BasketItem,
      Product,
      ProductVariant,
      Order,
      OrderItem,
      DiscountCode,
      Wallet,
      WalletTransaction,
      User,
      Address,
    ]),
    PaymentModule,
    WalletModule,
  ],

  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
