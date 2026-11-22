import { Module } from '@nestjs/common';
import { BasketItemsService } from './basket_items.service';
import { BasketItemsController } from './basket_items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasketItem } from './entities/basket_item.entity';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BasketItem, User, Product, ProductVariant]),
  ],
  controllers: [BasketItemsController],
  providers: [BasketItemsService],
})
export class BasketItemsModule {}
