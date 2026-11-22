import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookmarkProductDto } from './dto/bookmark_product.dto';
import { BookmarkProduct } from './entities/bookmark_product.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class BookmarkProductsService {
  constructor(
    @InjectRepository(BookmarkProduct)
    private readonly bookmarkRepository: Repository<BookmarkProduct>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  //BOOKMAERK SERVICE :
  ////کاربر یک محصول را به لیست نشانه‌گذاری‌شده‌ها اضافه می‌کند.
  //چک می‌کند محصول وجود دارد یا نه، چک می‌کند قبلاً بوکمارک نشده باشد.
  //یک رکورد جدید در بوکمارک_پروداکتز ثبت می‌کند
  async bookmarkProduct(userId: number, dto: BookmarkProductDto) {
    const product = await this.productRepository.findOneBy({
      id: dto.productId,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.bookmarkRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: dto.productId },
      },
    });

    if (existing) {
      throw new BadRequestException('already bookmarked');
    }

    const bookmark = this.bookmarkRepository.create({
      user: { id: userId },
      product: { id: dto.productId },
    });

    return await this.bookmarkRepository.save(bookmark);
  }

  //Unbookmark Product
  async unbookmarkProduct(userId: number, productId: number) {
    const result = await this.bookmarkRepository.delete({
      user: { id: userId },
      product: { id: productId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Bookmark does not exist');
    }
    //return { message: 'Unbookmarked successfully' };
  }

  //TOGGLE BOOKMARK
  async toggleBookmark(userId: number, productId: number) {
    const existing = await this.bookmarkRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (existing) {
      await this.bookmarkRepository.delete(existing);
      return { bookmarked: false };
    }

    const newBookmark = this.bookmarkRepository.create({
      user: { id: userId },
      product: { id: productId },
    });

    await this.bookmarkRepository.save(newBookmark);
    return { bookmarked: true };
  }
  //  CHECK IF BOOKMARKED
  async isBookmarked(userId: number, productId: number) {
    const exist = await this.bookmarkRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });
    return { bookmarked: !!exist };
    // !! makes boolean
  }

  // get all User Bookmarks
  async getUserBookmarks(userId: number) {
    return await this.bookmarkRepository.find({
      where: { user: { id: userId } },
      relations: { product: { categories: true } },
      order: { createdAt: 'DESC' },
    });
  }
}
