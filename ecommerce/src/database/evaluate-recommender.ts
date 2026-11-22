import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status';
import { BookmarkProduct } from '../bookmark_products/entities/bookmark_product.entity';
import { ProductView } from '../recommender/entities/product-view.entity';
import { Category } from '../categories/entities/category.entity';
import { RecommenderService } from '../recommender/recommender.service';
import { dataSource } from './data-source';

/**
 * ارزیابی آفلاین سیستم پیشنهاددهنده (پنهان‌کردن بخشی از بوکمارک‌ها)
 *
 * روش: برای هر کاربر که حداقل ۲ بوکمارک دارد، حدود ۲۰٪ آخرین بوکمارک‌ها (حداقل ۱ و
 * همیشه با حداقل ۱ بوکمارک باقی‌مانده) «پنهان» می‌شوند؛ این کار داخل یک تراکنش است
 * که در پایان Rollback می‌شود، پس هیچ داده‌ای واقعاً حذف نمی‌شود. محصولاتی که کاربر
 * خریده است از مجموعه‌ی پنهان‌شده کنار گذاشته می‌شوند (چون الگوریتم عمداً خریده‌شده‌ها
 * را پیشنهاد نمی‌دهد و آزمونشان بی‌معنی است). سپس لیست K پیشنهادی ساخته و با
 * مجموعه‌ی پنهان‌شده مقایسه می‌شود.
 *
 * محدودیت: این یک ارزیابی آفلاین «بازیابی بوکمارک‌های پنهان‌شده» است؛ نرخ کلیک،
 * رضایت یا افزایش فروش واقعی را نمی‌سنجد.
 *
 * روش‌های مقایسه: personalized (الگوریتم پروژه) | popularity (پرفروش‌ها بدون
 * محصولات شناخته‌شده‌ی کاربر) | random (نمونه‌ی تصادفی ثابت‌دانه).
 * همه‌ی معیارها با بازه‌ی اطمینان ۹۵٪ (Bootstrap) گزارش می‌شوند.
 *
 * اجرا: npm run evaluate     (اختیاری: K=10 npm run evaluate)
 */

export interface Stat {
  mean: number;
  lo: number;
  hi: number;
}

export interface EvalRow {
  method: string;
  users: number;
  hitRate: Stat;
  precision: Stat;
  recall: Stat;
  mrr: Stat;
  ndcg: Stat;
  coverage: number;
  diversity: number;
}

export interface EvalResult {
  rows: EvalRow[];
  /** تفاوت جفتی NDCG: personalized منهای هر روش پایه، با بازه‌ی اطمینان */
  pairedNdcgDiff: { versus: string; diff: Stat }[];
  skippedPurchasedHeldOut: number;
  skippedUnavailableHeldOut: number;
}

export interface EvalOptions {
  k?: number;
  seed?: number;
  holdoutRatio?: number;
  bootstrapRounds?: number;
  /** برای مقایسه‌ی نسخه‌ها: سازنده‌ی سرویس را می‌توان عوض کرد */
  createService?: (m: EntityManager) => RecommenderService;
}

// تولیدکننده‌ی شبه‌تصادفی ثابت‌دانه (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** میانگین + بازه‌ی اطمینان ۹۵٪ به روش Bootstrap (نمونه‌گیری مجدد با جایگذاری) */
export function bootstrap(
  xs: number[],
  rounds: number,
  random: () => number,
): Stat {
  if (!xs.length) return { mean: 0, lo: 0, hi: 0 };
  const means: number[] = [];
  for (let r = 0; r < rounds; r++) {
    let sum = 0;
    for (let i = 0; i < xs.length; i++)
      sum += xs[Math.floor(random() * xs.length)];
    means.push(sum / xs.length);
  }
  means.sort((a, b) => a - b);
  return {
    mean: mean(xs),
    lo: means[Math.floor(0.025 * (rounds - 1))],
    hi: means[Math.ceil(0.975 * (rounds - 1))],
  };
}

const defaultService = (m: EntityManager) =>
  new RecommenderService(
    m.getRepository(Product),
    m.getRepository(OrderItem),
    m.getRepository(ProductView),
    m.getRepository(BookmarkProduct),
    m.getRepository(Category),
  );

const METHODS = ['personalized', 'popularity', 'random'] as const;
type Method = (typeof METHODS)[number];

interface PerUser {
  hit: number[];
  precision: number[];
  recall: number[];
  mrr: number[];
  ndcg: number[];
  div: number[];
  seen: Set<number>;
}

export async function evaluateRecommender(
  ds: DataSource,
  opts: EvalOptions = {},
): Promise<EvalResult> {
  const k = opts.k ?? 10;
  const holdout = opts.holdoutRatio ?? 0.2;
  const rounds = opts.bootstrapRounds ?? 1000;
  const seed = opts.seed ?? 42;
  const random = rng(seed);
  const bootRandom = rng(seed + 1);
  const make = opts.createService ?? defaultService;

  // دسته‌های هر محصول (برای تنوع) و کل کاتالوگ (برای پوشش)
  const products = await ds
    .getRepository(Product)
    .find({ relations: { categories: true, variants: true } });
  // «قابل پیشنهاد» = موجود (محصول ساده: stock آزاد > ۰ | واریانت‌دار: حداقل یک واریانت موجود)
  const isAvailable = (p: Product) =>
    p.variants?.length
      ? p.variants.some((v) => v.stock - v.reservedStock > 0)
      : p.stock - p.reservedStock > 0;
  const availableIds = new Set(products.filter(isAvailable).map((p) => p.id));
  const catsOf = new Map<number, number[]>(
    products.map((p) => [p.id, (p.categories ?? []).map((c) => c.id)]),
  );
  // کاتالوگ قابل پیشنهاد؛ همه‌ی روش‌ها (از جمله random) فقط از همین مجموعه انتخاب می‌کنند
  const catalog = products.filter(isAvailable).map((p) => p.id);

  // بوکمارک‌های هر کاربر به ترتیب زمان (آخرین‌ها = پنهان‌شده)
  const bookmarks = await ds.getRepository(BookmarkProduct).find({
    relations: { user: true, product: true },
    order: { createdAt: 'ASC', id: 'ASC' },
  });
  const byUser = new Map<number, BookmarkProduct[]>();
  for (const b of bookmarks) {
    const list = byUser.get(b.user.id) ?? [];
    list.push(b);
    byUser.set(b.user.id, list);
  }

  const acc = Object.fromEntries(
    METHODS.map((m) => [
      m,
      {
        hit: [],
        precision: [],
        recall: [],
        mrr: [],
        ndcg: [],
        div: [],
        seen: new Set<number>(),
      } as PerUser,
    ]),
  ) as Record<Method, PerUser>;
  let skippedPurchased = 0;
  let skippedUnavailable = 0;

  for (const [userId, list] of byUser) {
    if (list.length < 2) continue;
    const holdCount = Math.min(
      Math.max(1, Math.round(list.length * holdout)),
      list.length - 1,
    );
    const heldRows = list.slice(-holdCount);
    const keptRows = list.slice(0, -holdCount);

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // محصولات خریداری‌شده‌ی کاربر (PAID)
      const purchasedIds = new Set(
        (
          await qr.manager
            .getRepository(OrderItem)
            .createQueryBuilder('oi')
            .innerJoin('oi.order', 'o', 'o.status = :paid', {
              paid: OrderStatus.PAID,
            })
            .innerJoin('o.user', 'u', 'u.id = :userId', { userId })
            .select('oi.productId', 'productId')
            .getRawMany<{ productId: string | number }>()
        ).map((r) => Number(r.productId)),
      );

      // پنهان‌شده‌هایی که قبلاً خریده شده‌اند یا ناموجودند برای هیچ روشی قابل پیشنهاد
      // نیستند → کنار گذاشته می‌شوند (مقایسه‌ی منصفانه برای همه‌ی روش‌ها)
      const notPurchased = heldRows.filter(
        (b) => !purchasedIds.has(b.product.id),
      );
      const relevantRows = notPurchased.filter((b) =>
        availableIds.has(b.product.id),
      );
      skippedPurchased += heldRows.length - notPurchased.length;
      skippedUnavailable += notPurchased.length - relevantRows.length;
      if (!relevantRows.length) continue;
      const relevant = new Set(relevantRows.map((b) => b.product.id));

      await qr.manager.delete(
        BookmarkProduct,
        heldRows.map((b) => b.id),
      );
      const svc = make(qr.manager);

      const known = new Set<number>([
        ...keptRows.map((b) => b.product.id),
        ...purchasedIds,
      ]);

      const lists: Record<Method, number[]> = {
        personalized: (await svc.getPersonalizedRecommendations(userId, k)).map(
          (p) => p.id,
        ),
        popularity: (await svc.getTopSellingProducts(50))
          .map((p) => p.id)
          .filter((id) => !known.has(id))
          .slice(0, k),
        random: (() => {
          const pool = catalog.filter((id) => !known.has(id));
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          return pool.slice(0, k);
        })(),
      };

      const idcg = Array.from(
        { length: Math.min(relevant.size, k) },
        (_, i) => 1 / Math.log2(i + 2),
      ).reduce((a, b) => a + b, 0);

      for (const m of METHODS) {
        const ids = lists[m];
        let hits = 0;
        let dcg = 0;
        let firstHitRank = 0;
        ids.forEach((id, i) => {
          if (relevant.has(id)) {
            hits++;
            dcg += 1 / Math.log2(i + 2);
            if (!firstHitRank) firstHitRank = i + 1;
          }
        });
        const a = acc[m];
        a.hit.push(hits > 0 ? 1 : 0);
        a.precision.push(ids.length ? hits / ids.length : 0);
        a.recall.push(hits / relevant.size);
        a.mrr.push(firstHitRank ? 1 / firstHitRank : 0);
        a.ndcg.push(idcg ? dcg / idcg : 0);
        const cats = new Set(ids.flatMap((id) => catsOf.get(id) ?? []));
        a.div.push(ids.length ? cats.size / ids.length : 0);
        ids.forEach((id) => a.seen.add(id));
      }
    } finally {
      await qr.rollbackTransaction();
      await qr.release();
    }
  }

  const rows: EvalRow[] = METHODS.map((m) => {
    const a = acc[m];
    return {
      method: m,
      users: a.hit.length,
      hitRate: bootstrap(a.hit, rounds, bootRandom),
      precision: bootstrap(a.precision, rounds, bootRandom),
      recall: bootstrap(a.recall, rounds, bootRandom),
      mrr: bootstrap(a.mrr, rounds, bootRandom),
      ndcg: bootstrap(a.ndcg, rounds, bootRandom),
      coverage: a.seen.size / Math.max(catalog.length, 1),
      diversity: mean(a.div),
    };
  });

  const pairedNdcgDiff = (['popularity', 'random'] as const).map((base) => ({
    versus: base,
    diff: bootstrap(
      acc.personalized.ndcg.map((v, i) => v - acc[base].ndcg[i]),
      rounds,
      bootRandom,
    ),
  }));

  return {
    rows,
    pairedNdcgDiff,
    skippedPurchasedHeldOut: skippedPurchased,
    skippedUnavailableHeldOut: skippedUnavailable,
  };
}

export function printEvaluation(result: EvalResult, k: number) {
  const f = (x: number) => x.toFixed(3);
  const s = (x: Stat) => `${f(x.mean)} [${f(x.lo)}, ${f(x.hi)}]`;
  console.table(
    result.rows.map((r) => ({
      روش: r.method,
      کاربران: r.users,
      [`HitRate@${k}`]: s(r.hitRate),
      [`Precision@${k}`]: s(r.precision),
      [`Recall@${k}`]: s(r.recall),
      MRR: s(r.mrr),
      [`NDCG@${k}`]: s(r.ndcg),
      Coverage: f(r.coverage),
      Diversity: f(r.diversity),
    })),
  );
  for (const d of result.pairedNdcgDiff) {
    const significant = d.diff.lo > 0 || d.diff.hi < 0;
    console.log(
      `تفاوت جفتی NDCG (personalized − ${d.versus}): ${s(d.diff)} ` +
        (significant ? '← معنی‌دار (بازه شامل صفر نیست)' : '← غیرمعنی‌دار'),
    );
  }
  console.log(
    `موارد پنهان‌شده‌ی کنار گذاشته‌شده از آزمون: قبلاً-خریداری‌شده ${result.skippedPurchasedHeldOut} | ناموجود ${result.skippedUnavailableHeldOut}`,
  );
}

async function main() {
  const k = Number(process.env.K ?? 10);
  await dataSource.initialize();
  const result = await evaluateRecommender(dataSource, { k });
  printEvaluation(result, k);
  await dataSource.destroy();
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ خطا در ارزیابی:', e);
    process.exit(1);
  });
}
