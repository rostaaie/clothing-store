import { Module } from '@nestjs/common';
import { BookmarkProductsService } from './bookmark_products.service';
import { BookmarkProductsController } from './bookmark_products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarkProduct } from './entities/bookmark_product.entity';
import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookmarkProduct, Product, User])],
  controllers: [BookmarkProductsController],
  providers: [BookmarkProductsService],
})
export class BookmarkProductsModule {}
