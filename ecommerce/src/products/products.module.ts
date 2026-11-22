import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Category } from 'src/categories/entities/category.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { BasketItem } from 'src/basket_items/entities/basket_item.entity';
import { BookmarkProduct } from 'src/bookmark_products/entities/bookmark_product.entity';
import { ProductView } from 'src/recommender/entities/product-view.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      Category,
      OrderItem,
      BasketItem,
      BookmarkProduct,
      ProductView,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
