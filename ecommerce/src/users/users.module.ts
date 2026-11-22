import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { BasketItem } from 'src/basket_items/entities/basket_item.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { WalletTransaction } from 'src/wallet/entities/wallet-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Ticket,
      BasketItem,
      Order,
      Wallet,
      WalletTransaction,
    ]),
  ],
  controllers: [ProfileController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
