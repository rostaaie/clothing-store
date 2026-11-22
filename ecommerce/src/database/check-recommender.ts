import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Category } from '../categories/entities/category.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status';
import { BookmarkProduct } from '../bookmark_products/entities/bookmark_product.entity';
import { ProductView } from '../recommender/entities/product-view.entity';
import { User } from '../users/entities/user.entity';
import { RecommenderService } from '../recommender/recommender.service';
import { dataSource } from './data-source';

/**
 * بررسی صحت سیستم پیشنهاددهنده روی دیتابیس واقعی (یک‌بار اجرا، همه‌چیز را می‌سنجد)
 *
 * هر چک روی خروجی واقعی سرویس‌ها «ویژگی‌های ثابت» را بررسی می‌کند (بدون تکرار، بدون
 * خودِ محصول، فقط محصولات موجود، بدون خرید/بوکمارک‌شده‌ها، رعایت limit و ...).
 * چک‌هایی که داده را دست‌کاری می‌کنند (موجودی، محصول بدون دسته، خریدِ تازه) داخل
 * تراکنش اجرا و در پایان Rollback می‌شوند؛ داده‌ی شما تغییر نمی‌کند.
 *
 * اجرا: npm run check:recommender      (کد خروج ۰ = همه‌چیز درست)
 */

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const isAvailable = (p: Product, variants: ProductVariant[]): boolean =>
  variants.length
    ? variants.some((v) => v.stock - v.reservedStock > 0)
    : p.stock - p.reservedStock > 0;

/** ذخیره‌ی یک رکورد با تایپ ساده (جلوگیری از ابهام overload های TypeORM) */
async function saveOne<T>(
  m: EntityManager,
  entity: new () => T,
  data: Record<string, unknown>,
): Promise<T> {
  return (await m.getRepository<any>(entity).save(data)) as T;
}

const dup = (ids: number[]) => ids.length !== new Set(ids).size;

async function withTx<T>(
  ds: DataSource,
  fn: (m: EntityManager) => Promise<T>,
): Promise<T> {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    return await fn(qr.manager);
  } finally {
    await qr.rollbackTransaction();
    await qr.release();
  }
}

const makeService = (m: EntityManager) =>
  new RecommenderService(
    m.getRepository(Product),
    m.getRepository(OrderItem),
    m.getRepository(ProductView),
    m.getRepository(BookmarkProduct),
    m.getRepository(Category),
  );

export async function checkRecommender(ds: DataSource): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const record = (name: string, ok: boolean, detail?: string) =>
    results.push({ name, ok, detail: ok ? undefined : detail });
  const guard = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      record(name, false, `استثنا: ${(e as Error).message}`);
    }
  };

  const svc = makeService(ds.manager);
  const products = await ds.getRepository(Product).find({
    relations: { categories: true, variants: true },
  });
  const availableIds = new Set(
    products.filter((p) => isAvailable(p, p.variants ?? [])).map((p) => p.id),
  );
  const unavailableIn = (ids: number[]) =>
    ids.filter((id) => !availableIds.has(id));

  // ── ۱) پرفروش‌ها ──
  await guard('پرفروش‌ها', async () => {
    const top = (await svc.getTopSellingProducts(10)).map((p) => p.id);
    record('پرفروش‌ها: تکراری ندارد', !dup(top), `ids=${top.join(',')}`);
    record('پرفروش‌ها: حداکثر limit', top.length <= 10, `n=${top.length}`);
    record(
      'پرفروش‌ها: خالی نیست (کاتالوگ موجود دارد)',
      !availableIds.size || top.length > 0,
    );
    record(
      'پرفروش‌ها: فقط محصول موجود',
      !unavailableIn(top).length,
      `ناموجود=${unavailableIn(top).join(',')}`,
    );
    const huge = await svc.getTopSellingProducts(100000);
    record('پرفروش‌ها: limit بزرگ به ۵۰ محدود می‌شود', huge.length <= 50);
    const neg = await svc.getTopSellingProducts(-5);
    record('پرفروش‌ها: limit منفی خطا نمی‌دهد', neg.length <= 10);
  });

  // ── ۲) محصولات مشابه ──
  await guard('مشابه', async () => {
    let bad = '';
    let nonEmpty = 0;
    for (const p of products) {
      const ids = (await svc.getSimilarProducts(p.id, 8)).map((x) => x.id);
      if (ids.length) nonEmpty++;
      if (dup(ids)) bad = `تکراری برای محصول ${p.id}`;
      else if (ids.includes(p.id)) bad = `خودِ محصول ${p.id} در مشابه‌هایش است`;
      else if (unavailableIn(ids).length)
        bad = `ناموجود در مشابه‌های ${p.id}: ${unavailableIn(ids).join(',')}`;
      else if (ids.length > 8) bad = `بیش از limit برای ${p.id}`;
      if (bad) break;
    }
    record(
      `مشابه: ${products.length} محصول بدون تکرار/خودش/ناموجود`,
      !bad,
      bad,
    );
    record(
      'مشابه: برای اغلب محصولات نتیجه دارد',
      nonEmpty >= products.length * 0.8,
      `${nonEmpty}/${products.length}`,
    );
    record(
      'مشابه: محصول ناموجود → []',
      (await svc.getSimilarProducts(-1)).length === 0,
    );
  });

  // ── ۳) اغلب همراه خریداری‌شده ──
  await guard('همراه', async () => {
    let bad = '';
    let withResult = 0;
    for (const p of products) {
      const res = await svc.getFrequentlyBoughtTogether(p.id, 8);
      const ids = res.map((x) => x.id);
      if (ids.length) withResult++;
      if (dup(ids)) bad = `تکراری برای ${p.id}`;
      else if (ids.includes(p.id)) bad = `خودش برای ${p.id}`;
      else if (unavailableIn(ids).length) bad = `ناموجود برای ${p.id}`;
      else if (res.some((x) => !(x.purchasedTogether >= 1)))
        bad = `purchasedTogether نامعتبر برای ${p.id}`;
      if (bad) break;
    }
    record(
      `همراه: ${products.length} محصول بدون تکرار/خودش/ناموجود`,
      !bad,
      bad,
    );
    record(
      'همراه: حداقل یک محصول نتیجه دارد (سفارش PAID وجود دارد)',
      withResult > 0,
      `withResult=${withResult}`,
    );
  });

  // ── ۴) پیشنهاد شخصی برای همه‌ی کاربران ──
  await guard('شخصی', async () => {
    const users = await ds.getRepository(User).find();
    const target = 10;
    let bad = '';
    let tested = 0;
    for (const u of users) {
      const bm = await ds.getRepository(BookmarkProduct).find({
        where: { user: { id: u.id } },
        relations: { product: true },
      });
      const bought = await ds
        .getRepository(OrderItem)
        .createQueryBuilder('oi')
        .innerJoin('oi.order', 'o', 'o.status = :paid', {
          paid: OrderStatus.PAID,
        })
        .innerJoin('o.user', 'u', 'u.id = :uid', { uid: u.id })
        .select('oi.productId', 'productId')
        .getRawMany<{ productId: string | number }>();
      const own = new Set([
        ...bm.map((b) => b.product.id),
        ...bought.map((r) => Number(r.productId)),
      ]);
      const ids = (await svc.getPersonalizedRecommendations(u.id, target)).map(
        (p) => p.id,
      );
      tested++;
      if (dup(ids)) bad = `تکراری برای کاربر ${u.id}`;
      else if (ids.length > target) bad = `بیش از limit برای ${u.id}`;
      else if (ids.some((id) => own.has(id)))
        bad = `خرید/بوکمارک‌شده پیشنهاد شده برای ${u.id}`;
      else if (unavailableIn(ids).length) bad = `ناموجود برای ${u.id}`;
      else if (ids.length < Math.min(target, availableIds.size - own.size))
        bad = `کمتر از limit بدون دلیل برای ${u.id} (${ids.length})`;
      if (bad) break;
    }
    record(
      `شخصی: ${tested} کاربر بدون تکرار/خرید/ناموجود و با پر شدن limit`,
      !bad,
      bad,
    );
  });

  // ── ۵) سناریوهای کنترل‌شده (داخل تراکنش، Rollback) ──
  await guard('سناریو: کاربر تازه', () =>
    withTx(ds, async (m) => {
      const s = makeService(m);
      const user = await saveOne(m, User, {
        mobile: '09000000000',
        display_name: 'check-user',
      });
      const recs = await s.getPersonalizedRecommendations(user.id, 10);
      record(
        'کاربر تازه (cold start): پیشنهاد خالی نیست',
        !availableIds.size || recs.length > 0,
        `n=${recs.length}`,
      );
    }),
  );

  await guard('سناریو: محصول بدون دسته', () =>
    withTx(ds, async (m) => {
      const s = makeService(m);
      const ref = products[0];
      const lone = await saveOne(m, Product, {
        title: 'check-nocat',
        description: 'x',
        price: ref?.price ?? 1000,
        stock: 5,
      });
      const sim = await s.getSimilarProducts(lone.id, 8);
      const ids = sim.map((p) => p.id);
      record(
        'محصول بدون دسته: مشابه‌ها خطا نمی‌دهد و خودش را شامل نیست',
        !ids.includes(lone.id) && !dup(ids),
      );
    }),
  );

  await guard('سناریو: موجودی', () =>
    withTx(ds, async (m) => {
      const s = makeService(m);
      const top = await s.getTopSellingProducts(5);
      if (!top.length) return;
      const victim = top[0];
      await m
        .getRepository(Product)
        .update({ id: victim.id }, { stock: 0, reservedStock: 0 });
      // محصول ساده با موجودی صفر → حذف می‌شود (اگر واریانت نداشته باشد)
      const hasVariants = await m
        .getRepository(ProductVariant)
        .count({ where: { product: { id: victim.id } } });
      const after = (await s.getTopSellingProducts(10)).map((p) => p.id);
      if (!hasVariants)
        record(
          'موجودی: محصول با stock=0 از پرفروش‌ها حذف می‌شود',
          !after.includes(victim.id),
        );

      // محصول واریانت‌دار: stock خودِ محصول صفر ولی یک واریانت موجود → «موجود» است
      await m.getRepository(Product).update({ id: victim.id }, { stock: 0 });
      await saveOne(m, ProductVariant, {
        product: { id: victim.id },
        stock: 3,
        reservedStock: 0,
      });
      const withVariant = (await s.getTopSellingProducts(10)).map((p) => p.id);
      record(
        'موجودی: محصول با واریانتِ موجود (stock خودش صفر) حذف نمی‌شود',
        withVariant.includes(victim.id),
      );
    }),
  );

  await guard('سناریو: وزن خرید', () =>
    withTx(ds, async (m) => {
      const s = makeService(m);
      const cats = await m.getRepository(Category).find();
      // دو محصول موجود در دو دسته‌ی کاملاً جدا (ریشه‌های متفاوت)
      const a = products.find(
        (p) => availableIds.has(p.id) && p.categories?.length === 1,
      );
      const b = products.find(
        (p) =>
          availableIds.has(p.id) &&
          p.categories?.length === 1 &&
          p.categories[0].id !== a?.categories[0].id,
      );
      if (!a || !b || !cats.length) return;
      const user = await saveOne(m, User, {
        mobile: '09000000001',
        display_name: 'check-buyer',
      });
      const order = await saveOne(m, Order, {
        user,
        status: OrderStatus.PAID,
        totalPrice: a.price,
        finalPrice: a.price,
        paidAt: new Date(Date.now() - 2 * 86_400_000),
      });
      await saveOne(m, OrderItem, {
        order,
        product: a,
        price: a.price,
        quantity: 3,
        total: a.price * 3,
      });
      await saveOne(m, BookmarkProduct, { user, product: b });
      const recs = await s.getPersonalizedRecommendations(user.id, 6);
      const first = recs[0];
      const firstCats = new Set(
        (products.find((p) => p.id === first?.id)?.categories ?? []).map(
          (c) => c.id,
        ),
      );
      record(
        'وزن خرید: ۳ عدد خرید تازه از دسته‌ی A بر یک بوکمارک از دسته‌ی B غلبه دارد',
        firstCats.has(a.categories[0].id),
        `اولین پیشنهاد=${first?.id}`,
      );
    }),
  );

  return results;
}

async function main() {
  await dataSource.initialize();
  const results = await checkRecommender(dataSource);
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(
      `${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? `  →  ${r.detail}` : ''}`,
    );
  }
  console.log(
    failed
      ? `\n❌ ${failed} چک از ${results.length} ناموفق بود`
      : `\n🎉 همه‌ی ${results.length} چک موفق بود`,
  );
  await dataSource.destroy();
  process.exit(failed ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ خطا در اجرای چک‌ها:', e);
    process.exit(1);
  });
}
