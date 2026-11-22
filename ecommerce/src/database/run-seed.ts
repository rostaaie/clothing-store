import { runSeeders } from 'typeorm-extension';
import { dataSource } from './data-source';
import ResetSeeder from './seeds/00-reset.seed';
import UserSeeder from './seeds/01-user.seed';
import CategorySeeder from './seeds/02-category.seed';
import ProductSeeder from './seeds/03-product.seed';
import OrderSeeder from './seeds/04-order.seed';
import BookmarkViewSeeder from './seeds/05-bookmark-view.seed';
import WalletSeeder from './seeds/06-wallet.seed';
import BasketSeeder from './seeds/07-basket.seed';

/**
 * اجرای seed ها با typeorm-extension:
 *   npm run seed
 * ترتیب مهم است: ریست → کاربر → دسته‌بندی → محصول → سفارش → بوکمارک/بازدید
 */
async function main() {
  await dataSource.initialize();
  console.log('📦 اتصال به دیتابیس برقرار شد');

  await runSeeders(dataSource, {
    seeds: [
      ResetSeeder,
      UserSeeder,
      CategorySeeder,
      ProductSeeder,
      OrderSeeder,
      BookmarkViewSeeder,
      WalletSeeder,
      BasketSeeder,
    ],
  });

  console.log('🎉 Seed با موفقیت کامل شد');
  await dataSource.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ خطا در اجرای Seed:', error);
  process.exit(1);
});
