import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { OrderStatus } from '../../orders/enums/order-status';
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
 * سفارش‌های نمونه برای همه‌ی کاربران عادی (هر کاربر ۱ تا ۳ سفارش با
 * ۱ تا ۴ آیتم تصادفی) تا سیستم‌های پیشنهاد (bought-together و top-selling)
 * و صفحه «سفارش‌های من» داده‌ی واقعی داشته باشند.
 */
export default class OrderSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const productRepository = dataSource.getRepository(Product);
    const orderRepository = dataSource.getRepository(Order);
    const orderItemRepository = dataSource.getRepository(OrderItem);

    const { pathOf } = await buildCategoryPaths(dataSource);
    const products = await productRepository.find({
      relations: { categories: true },
    });
    if (products.length === 0) {
      console.warn('⚠️ محصولی برای سفارش وجود ندارد');
      return;
    }

    const users = await userRepository.find({
      where: { role: UserRoleEnum.NormalUser },
    });
    if (users.length === 0) {
      console.warn('⚠️ کاربر عادی‌ای برای سفارش وجود ندارد');
      return;
    }

    let ordersCount = 0;
    for (const user of users) {
      const orderCount = 1 + Math.floor(rand() * 3); // ۱ تا ۳ سفارش برای هر کاربر
      for (let o = 0; o < orderCount; o++) {
        const itemCount = 1 + Math.floor(rand() * 4); // ۱ تا ۴ آیتم در هر سفارش
        const items: OrderItem[] = [];

        // اغلب آیتم‌های یک سفارش از علاقه‌ی شخصیت کاربر است (۱۵٪ نویز)
        const pool = personaPool(products, pathOf, personaOf(user));
        for (const product of pickMixed(pool, products, itemCount, 0.15)) {
          const quantity = 1 + Math.floor(rand() * 3);
          const total = product.price * quantity;
          items.push(
            orderItemRepository.create({
              product,
              price: product.price,
              quantity,
              total,
            }),
          );
        }

        const totalPrice = items.reduce((sum, i) => sum + i.total, 0);
        const status = rand() < 0.7 ? OrderStatus.PAID : OrderStatus.PENDING;

        await orderRepository.save(
          orderRepository.create({
            user,
            totalPrice,
            finalPrice: totalPrice,
            discountAmount: 0,
            status,
            ...(status === OrderStatus.PAID
              ? { paidAt: randomPastDate(60) }
              : {}),
            items,
          }),
        );
        ordersCount++;
      }
    }

    console.log(
      `✅ ${ordersCount} سفارش نمونه برای ${users.length} کاربر seed شد`,
    );
  }
}
