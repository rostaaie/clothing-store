import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommenderController } from './recommender.controller';
import { RecommenderService } from './recommender.service';
import { ProductView } from './entities/product-view.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { BookmarkProduct } from 'src/bookmark_products/entities/bookmark_product.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductView,
      Product,
      OrderItem,
      BookmarkProduct,
      Category,
    ]),
  ],
  controllers: [RecommenderController],
  providers: [RecommenderService],
  exports: [RecommenderService, TypeOrmModule],
})
export class RecommenderModule {}
