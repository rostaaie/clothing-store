import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

/**
 * اولین seeder: جدول‌های کاتالوگ و دیتای seed را پاک می‌کند تا اجرای seed
 * همیشه نتیجه‌ی یکسان و تمیز داشته باشد (idempotent).
 * کاربران و دیتای ساخته‌شده توسط کاربر در اپلیکیشن (تیکت، آدرس)
 * حفظ می‌شوند؛ فقط جدول‌هایی که خود seed می‌سازد ریست می‌شوند.
 * ترتیب مهم نیست چون FOREIGN_KEY_CHECKS موقتاً خاموش می‌شود.
 */
const TABLES = [
  'product_category', // جدول واسط product <-> category
  'product_variants',
  'basket_items',
  'bookmark_products',
  'product_views',
  'order_items',
  'orders',
  'products',
  'categories',
  'wallet_transaction',
  'wallet',
];

export default class ResetSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const table of TABLES) {
        await dataSource.query(`TRUNCATE TABLE \`${table}\``);
      }
    } finally {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    console.log('🧹 جدول‌های seed پاک‌سازی شدند');
  }
}
