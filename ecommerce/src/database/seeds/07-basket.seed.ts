import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { BasketItem } from '../../basket_items/entities/basket_item.entity';
import UserRoleEnum from '../../users/enums/userRoleEnum';

/**
 * سبد خرید نمونه: برای بعضی از کاربران عادی ۱ تا ۳ محصول با تعداد تصادفی
 * تا صفحه‌ی سبد خرید هم داده‌ی واقعی داشته باشد.
 */
export default class BasketSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const productRepository = dataSource.getRepository(Product);
    const basketRepository = dataSource.getRepository(BasketItem);

    const products = await productRepository.find();
    if (products.length === 0) {
      console.warn('⚠️ محصولی برای سبد خرید وجود ندارد');
      return;
    }

    const users = await userRepository.find({
      where: { role: UserRoleEnum.NormalUser },
    });
    if (users.length === 0) return;

    let items = 0;
    for (const user of users) {
      // حدود نیمی از کاربران سبد دارند
      if (Math.random() < 0.5) continue;

      const itemCount = 1 + Math.floor(Math.random() * 3); // ۱ تا ۳ آیتم
      const picked = new Set<number>();
      for (let i = 0; i < itemCount; i++) {
        let idx = Math.floor(Math.random() * products.length);
        if (picked.has(idx) && products.length > 1) {
          idx = (idx + 1) % products.length;
        }
        picked.add(idx);

        await basketRepository.save(
          basketRepository.create({
            user,
            product: products[idx],
            quantity: 1 + Math.floor(Math.random() * 3),
          }),
        );
        items++;
      }
    }

    console.log(`✅ ${items} آیتم سبد خرید برای کاربران seed شد`);
  }
}
