import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { BookmarkProduct } from '../../bookmark_products/entities/bookmark_product.entity';
import { ProductView } from '../../recommender/entities/product-view.entity';
import UserRoleEnum from '../../users/enums/userRoleEnum';
import { buildCategoryPaths } from './category-paths';
import {
  personaOf,
  personaPool,
  pickMixed,
  rand,
  randomPastDate,
} from './personas';

/**
 * بوکمارک و بازدید محصول برای همه‌ی کاربران عادی تا سیستم پیشنهاد «for-me»
 * داده‌ی کافی داشته باشد. هر کاربر یک «شخصیت» دارد (personas.ts) و بیشتر
 * بوکمارک/بازدیدهایش از بخش‌های مورد علاقه‌ی همان شخصیت است، با کمی نویز.
 */
export default class BookmarkViewSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const productRepository = dataSource.getRepository(Product);
    const bookmarkRepository = dataSource.getRepository(BookmarkProduct);
    const productViewRepository = dataSource.getRepository(ProductView);

    const users = await userRepository.find({
      where: { role: UserRoleEnum.NormalUser },
    });
    if (users.length === 0) {
      console.warn('⚠️ کاربر عادی‌ای یافت نشد، بوکمارک/بازدید ساخته نشد');
      return;
    }

    const { pathOf } = await buildCategoryPaths(dataSource);
    const products = await productRepository.find({
      relations: { categories: true },
    });

    let bookmarks = 0;
    let views = 0;
    for (const user of users) {
      const pool = personaPool(products, pathOf, personaOf(user));

      // ۳ تا ۸ بوکمارک (۱۰٪ نویز)
      const bookmarkCount = 3 + Math.floor(rand() * 6);
      for (const product of pickMixed(pool, products, bookmarkCount, 0.1)) {
        await bookmarkRepository.save(
          bookmarkRepository.create({
            user,
            product,
            // تاریخ تصادفی در ۴۵ روز گذشته تا وزن‌دهی زمانی روی بوکمارک هم دیده شود
            createdAt: randomPastDate(45),
          }),
        );
        bookmarks++;
      }

      // ۴ تا ۱۰ بازدید (۲۵٪ نویز) با زمان آخرین بازدید در ۳۰ روز گذشته
      const viewCount = 4 + Math.floor(rand() * 7);
      for (const product of pickMixed(pool, products, viewCount, 0.25)) {
        await productViewRepository.save(
          productViewRepository.create({
            userId: user.id,
            productId: product.id,
            viewCount: 1 + Math.floor(rand() * 10),
            lastViewedAt: randomPastDate(30),
          }),
        );
        views++;
      }
    }

    console.log(
      `✅ ${bookmarks} بوکمارک و ${views} بازدید برای ${users.length} کاربر seed شد`,
    );
  }
}
