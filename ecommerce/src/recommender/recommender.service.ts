import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { OrderStatus } from 'src/orders/enums/order-status';
import { ProductView } from './entities/product-view.entity';
import { BookmarkProduct } from 'src/bookmark_products/entities/bookmark_product.entity';
import { Category } from 'src/categories/entities/category.entity';

// ═══════════════════════ تنظیمات الگوریتم ═══════════════════════
// وزن پایین هر سیگنال (خرید قوی‌ترین، بازدید ضعیف‌ترین)
const SIGNAL_WEIGHTS = {
  purchase: 3,
  bookmark: 2,
  view: 1,
} as const;

// نیم‌عمر هر سیگنال به روز: بعد از این مدت وزن سیگنال نصف می‌شود
const HALF_LIFE_DAYS = {
  purchase: 45,
  bookmark: 30,
  view: 14,
} as const;

// سقف سیگنال بازدید برای هر محصول: log2(1+n) تا ۱۵ بازدید محاسبه می‌شود
const MAX_VIEW_SIGNAL = 4;

// سقف تعداد خرید یک محصول در امتیاز علاقه (۱۰ عدد باتری ≠ ۱۰ برابر علاقه)
const MAX_UNITS_PER_PRODUCT = 5;

// ضریب کاهش امتیاز محصولاتی که کاربر دیده ولی ذخیره/نخریده (حذف نمی‌شوند)
const VIEWED_PENALTY = 0.35;

// حداکثر نامزدهای واکشی‌شده از دیتابیس در هر بخش (کوئری‌های همیشه محدود)
const CANDIDATE_POOL_SIZE = 120;
const SIMILAR_POOL_SIZE = 60;
const CO_PURCHASE_POOL_SIZE = 40;
// حداکثر سفارش‌های دارای محصول هدف که برای تحلیل خرید همراه بررسی می‌شوند.
// مخرج lift نیز به همان بازه‌ی زمانیِ این سفارش‌ها محدود می‌شود تا صورت و مخرج
// روی یک مجموعه‌ی هم‌بازه محاسبه شوند.
const MAX_RECENT_ORDERS = 300;

// حداقل بسامد برای اعتماد به «اغلب همراه خریداری می‌شود»
const MIN_CO_SUPPORT = 2;

// شباهت بین دو دسته‌بندی در درخت (ریشه › گروه › برگ):
// همان دسته = ۱، هم‌گروه (والد یکسان) = ۰٫۵، هم‌ریشه = ۰٫۲۵، غیر از این = ۰
// چون در کاتالوگ واقعی هر دسته‌ی برگ فقط چند محصول دارد، علاقه به یک دسته
// باید به دسته‌های هم‌گروه هم سرایت کند.
const SIMILARITY_SAME_PARENT = 0.5;
const SIMILARITY_SAME_ROOT = 0.25;
const TREE_CACHE_TTL_MS = 60_000;

// پرفروش‌ها: ابتدا پنجره‌ی اخیر؛ اگر کم بود با فروش کلی تکمیل می‌شود
const TOP_SELLING_WINDOW_DAYS = 90;
// چون محصولات ناموجود حذف می‌شوند، چند برابر نیاز واکشی می‌شود
const OVERFETCH_FACTOR = 3;

/**
 * شرط «موجود بودن» (مثل فروشگاه‌های واقعی، محصول ناموجود پیشنهاد نمی‌شود):
 * محصول ساده (بدون واریانت) → stock - reservedStock > 0
 * محصول دارای واریانت → حداقل یک واریانت با موجودی آزاد
 */
const availableSql = (alias: string): string =>
  `((${alias}.stock - ${alias}.reservedStock > 0 AND NOT EXISTS ` +
  `(SELECT 1 FROM product_variants pv WHERE pv.productId = ${alias}.id)) ` +
  `OR EXISTS (SELECT 1 FROM product_variants pv2 WHERE pv2.productId = ${alias}.id ` +
  `AND pv2.stock - pv2.reservedStock > 0))`;

// سقف تعداد نتیجه‌ی قابل درخواست (جلوگیری از limit خیلی بزرگ/منفی از سمت کلاینت)
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

/** limit ورودی را به عدد صحیح در بازه‌ی [1..MAX_LIMIT] محدود می‌کند */
const clampLimit = (value: number, fallback = DEFAULT_LIMIT): number => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, MAX_LIMIT);
};

interface PurchaseSignal {
  quantity: number;
  at: Date;
  product: Product;
}

// سطرهای خام getRawMany (مقادیر عددی از MySQL به‌صورت رشته برمی‌گردند)
interface SharedCategoryRow {
  id: string | number;
  shared: string | number;
}
interface OrderIdRow {
  orderId: string | number;
  paidAt?: string | Date | null;
}
interface TotalOrdersRow {
  totalOrders?: string | number | null;
}
interface ProductFrequencyRow {
  productId: string | number;
  frequency: string | number;
}
interface ProductOrderCountRow {
  productId: string | number;
  orderCount: string | number;
}
interface TotalSoldRow {
  productId: string | number;
  totalSold: string | number;
}

@Injectable()
export class RecommenderService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(ProductView)
    private readonly productViewRepo: Repository<ProductView>,

    @InjectRepository(BookmarkProduct)
    private readonly bookmarkRepo: Repository<BookmarkProduct>,

    // اختیاری: اگر نباشد، شباهت فقط روی «همان دسته‌ی برگ» حساب می‌شود
    @Optional()
    @InjectRepository(Category)
    private readonly categoryRepo?: Repository<Category>,
  ) {}

  /** کش کوتاه‌مدت «شناسه‌ی دسته → شناسه‌ی والد» (درخت دسته‌ها کوچک و کم‌تغییر است) */
  private treeCache: { at: number; map: Map<number, number | null> } | null =
    null;

  // ─────────────────────────────────────────────────────────────
  // پیشنهاد شخصی‌سازی‌شده (امتیازمحور، نه حذف‌محور)
  //
  // ۱) سه سیگنال با وزن و نیم‌عمر متفاوت → پروفایل علاقه‌مندی دسته‌بندی‌ها
  //    خرید PAID > بوکمارک > بازدید؛ همه با decay زمانی
  // ۲) نامزدها از دسته‌های محبوب امتیاز می‌گیرند و رتبه می‌شوند
  //    (دیده‌شده‌ها جریمه می‌شوند نه حذف؛ خریده/بوکمارک‌شده حذف می‌شوند)
  // ۳) سقف تنوع برای جلوگیری از تسلط یک دسته
  // ۴) جای خالی با «کشف» (جدیدترین‌های خارج از دسته‌های محبوب) پر می‌شود
  // ۵) بدون هیچ سیگنالی → پرفروش‌ها (cold start)
  // ─────────────────────────────────────────────────────────────
  async getPersonalizedRecommendations(
    userId: number,
    limit = DEFAULT_LIMIT,
  ): Promise<Product[]> {
    limit = clampLimit(limit);
    const [bookmarkRows, views, orderItems] = await Promise.all([
      this.bookmarkRepo.find({
        where: { user: { id: userId } },
        relations: { product: true },
      }),
      this.productViewRepo.find({
        where: { userId },
        order: { viewCount: 'DESC' },
      }),
      this.getPurchaseSignals(userId),
    ]);

    const bookmarkProductIds = bookmarkRows.map((b) => b.product.id);

    const purchasedMap = new Map<number, PurchaseSignal>();
    for (const oi of orderItems) {
      if (!oi.product) continue;
      const prev = purchasedMap.get(oi.product.id);
      const at = oi.order?.paidAt ?? oi.order?.createdAt ?? new Date(0);
      purchasedMap.set(oi.product.id, {
        quantity: (prev?.quantity ?? 0) + oi.quantity,
        at: prev && prev.at > at ? prev.at : at,
        product: oi.product,
      });
    }

    // cold start: کاربر تازه‌کار → پرفروش‌ها
    if (!bookmarkProductIds.length && !views.length && !purchasedMap.size) {
      return this.getTopSellingProducts(limit);
    }

    const excluded = new Set<number>(bookmarkProductIds);
    for (const id of purchasedMap.keys()) excluded.add(id);
    const viewedIds = new Set(views.map((v) => v.productId));

    // ── پروفایل علاقه‌مندی دسته‌بندی‌ها ──
    const affinity = new Map<number, number>();
    const bump = (catId: number, weight: number) =>
      affinity.set(catId, (affinity.get(catId) ?? 0) + weight);

    if (bookmarkProductIds.length) {
      const liked = await this.productRepo.find({
        where: { id: In(bookmarkProductIds) },
        relations: { categories: true },
      });
      const bookmarkedAt = new Map(
        bookmarkRows.map((b) => [b.product.id, b.createdAt]),
      );
      for (const p of liked) {
        for (const cat of p.categories ?? []) {
          bump(
            cat.id,
            SIGNAL_WEIGHTS.bookmark *
              this.decay(bookmarkedAt.get(p.id), HALF_LIFE_DAYS.bookmark),
          );
        }
      }
    }

    if (views.length) {
      const viewedProducts = await this.productRepo.find({
        where: { id: In(views.map((v) => v.productId)) },
        relations: { categories: true },
      });
      const byId = new Map(viewedProducts.map((p) => [p.id, p]));
      for (const view of views) {
        const product = byId.get(view.productId);
        if (!product) continue;
        const strength = Math.min(
          Math.log2(1 + view.viewCount),
          MAX_VIEW_SIGNAL,
        );
        for (const cat of product.categories ?? []) {
          bump(
            cat.id,
            SIGNAL_WEIGHTS.view *
              strength *
              this.decay(view.lastViewedAt, HALF_LIFE_DAYS.view),
          );
        }
      }
    }

    for (const signal of purchasedMap.values()) {
      const qty = Math.min(signal.quantity, MAX_UNITS_PER_PRODUCT);
      for (const cat of signal.product.categories ?? []) {
        bump(
          cat.id,
          SIGNAL_WEIGHTS.purchase *
            qty *
            this.decay(signal.at, HALF_LIFE_DAYS.purchase),
        );
      }
    }

    // سیگنال‌ها بودند ولی هیچ‌کدام دسته نداشتند → پرفروش‌ها
    if (!affinity.size) return this.getTopSellingProducts(limit);

    // نرمال‌سازی به بازه [0..1] — مقیاس مطلق وزن‌ها بی‌معناست
    const maxAffinity = Math.max(...affinity.values());
    if (!(maxAffinity > 0)) return this.getTopSellingProducts(limit);
    for (const [catId, value] of affinity)
      affinity.set(catId, value / maxAffinity);

    // دسته‌های برتر (نرم: ۱۰ دسته، نه بریدگی سختِ ۵تایی)
    const topCats = [...affinity.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    // درخت دسته‌ها (در نبودنش null) → نامزدها از دسته‌های هم‌گروه هم می‌آیند
    const tree = await this.loadCategoryTree();
    const poolCatIds = this.expandToSiblingCategories(topCats, tree);

    const discoverySlots = this.discoverySlots(limit);
    const personalTarget = limit - discoverySlots;

    // ── نامزدها: امتیاز می‌گیرند، فقط خریده/بوکمارک‌شده‌ها حذف می‌شوند ──
    const candidatesQb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category')
      .where('category.id IN (:...topCats)', { topCats: poolCatIds })
      .andWhere(availableSql('product'))
      // ترتیب صریح: بدون ORDER BY نتیجه‌ی LIMIT نامعین است؛ جدیدترین‌ها اول
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('product.id', 'DESC');
    if (excluded.size) {
      candidatesQb.andWhere('product.id NOT IN (:...excluded)', {
        excluded: [...excluded],
      });
    }
    const candidates = await candidatesQb.take(CANDIDATE_POOL_SIZE).getMany();

    // امتیاز هر محصول = مجموع نزدیکی دسته‌هایش؛ دیده‌شده جریمه می‌شود
    const scored = candidates
      .map((p) => {
        let score = 0;
        for (const cat of p.categories ?? [])
          score += this.categoryScore(cat.id, affinity, tree);
        if (viewedIds.has(p.id)) score *= VIEWED_PENALTY;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.p.id - a.p.id);

    // سقف تنوع: یک دسته نباید کل لیست را ببلعد
    const maxPerCat = Math.max(2, Math.ceil(personalTarget / 3));
    const perCatCount = new Map<number, number>();
    const picked: Product[] = [];
    const pickedIds = new Set<number>();

    for (const { p } of scored) {
      if (picked.length >= personalTarget) break;
      const cats = p.categories ?? [];
      if (cats.some((c) => (perCatCount.get(c.id) ?? 0) >= maxPerCat)) continue;
      picked.push(p);
      pickedIds.add(p.id);
      for (const c of cats)
        perCatCount.set(c.id, (perCatCount.get(c.id) ?? 0) + 1);
    }

    // ── کشف: ابتدا خارج از دسته‌های محبوب، سپس تکمیل با جدیدترین‌ها ──
    if (picked.length < limit) {
      const block = new Set<number>([...excluded, ...pickedIds]);
      const remaining = limit - picked.length;

      // مرحله ۱: فیلتر «خارج از دسته‌های محبوب» در SQL انجام می‌شود تا
      // محدودیت take باعث نادیده‌گرفتن نامزدهای کشف نشود.
      let outside: Product[] = [];
      if (poolCatIds.length) {
        const outsideQb = this.productRepo
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.categories', 'category')
          .where(availableSql('product'))
          .andWhere(
            `NOT EXISTS (SELECT 1 FROM product_category pc WHERE pc.product_id = product.id AND pc.category_id IN (:...poolCatIds))`,
            { poolCatIds },
          )
          .orderBy('product.createdAt', 'DESC')
          .addOrderBy('product.id', 'DESC');
        if (block.size) {
          outsideQb.andWhere('product.id NOT IN (:...block)', {
            block: [...block],
          });
        }
        outside = await outsideQb.take(remaining * 2).getMany();
      }
      picked.push(...outside);

      // مرحله ۲: اگر تعداد کافی محصول خارج از دسته‌های محبوب نبود،
      // جایگاه‌های باقی‌مانده با جدیدترین محصولات موجود پر می‌شوند تا
      // خروجی بی‌دلیل کوتاه نماند.
      if (picked.length < limit) {
        const fallbackBlock = [...block, ...outside.map((p) => p.id)];
        const fallbackQb = this.productRepo
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.categories', 'category')
          .where(availableSql('product'))
          .orderBy('product.createdAt', 'DESC')
          .addOrderBy('product.id', 'DESC');
        if (fallbackBlock.length) {
          fallbackQb.andWhere('product.id NOT IN (:...fallbackBlock)', {
            fallbackBlock,
          });
        }
        const fallback = await fallbackQb
          .take((limit - picked.length) * 3)
          .getMany();
        picked.push(...fallback);
      }
    }

    return picked.slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────
  // محصولات مشابه (Content-Based)
  // استخر محدود در SQL (همان دسته › هم‌گروه › هم‌ریشه) + نزدیکی قیمت خودنرمال‌شونده
  // ─────────────────────────────────────────────────────────────
  async getSimilarProducts(productId: number, limit = 8): Promise<Product[]> {
    limit = clampLimit(limit, 8);
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: { categories: true },
    });

    if (!product) return [];

    const targetCats = product.categories.map((c) => c.id);
    if (!targetCats.length) {
      return this.getByPriceRange(product.price, productId, limit);
    }

    const tree = await this.loadCategoryTree();

    // سطح ۱: همان دسته + هم‌گروه‌ها (بدون درخت دسته‌ها: فقط همان دسته)
    const ids = await this.similarPoolIds(
      product,
      targetCats,
      this.expandToSiblingCategories(targetCats, tree),
      [],
    );
    // سطح ۲: اگر کافی نبود، دسته‌های هم‌ریشه هم وارد می‌شوند
    if (tree && ids.length < limit) {
      ids.push(
        ...(await this.similarPoolIds(
          product,
          targetCats,
          this.expandToSameRoot(targetCats, tree),
          ids,
        )),
      );
    }
    // آخرین چاره: نزدیک‌ترین قیمت‌ها (مثلاً کاتالوگ خیلی کوچک)
    if (!ids.length) {
      return this.getByPriceRange(product.price, productId, limit);
    }

    const pool = await this.productRepo.find({
      where: { id: In(ids) },
      relations: { categories: true },
    });

    // نزدیکی قیمت نسبت به خود استخر نرمال می‌شود (بدون عدد جادویی)
    const maxDiff = Math.max(
      ...pool.map((p) => Math.abs(p.price - product.price)),
      1,
    );

    // امتیاز = شباهت دسته‌ها (۰..۱) × ۲ + نزدیکی قیمت (۰..۱)
    return pool
      .map((p) => ({
        p,
        score:
          this.similarityToTarget(p, targetCats, tree) * 2 +
          (1 - Math.abs(p.price - product.price) / maxDiff),
      }))
      .sort((a, b) => b.score - a.score || b.p.id - a.p.id)
      .slice(0, limit)
      .map((x) => x.p);
  }

  /**
   * استخر نامزدهای «مشابه» در SQL: شناسه‌ی محصولاتی در poolCatIds که
   * اول «همان دسته» (exact) و بعد نزدیک‌ترین قیمت‌ها در ابتدا قرار می‌گیرند.
   */
  private async similarPoolIds(
    product: Product,
    exactCatIds: number[],
    poolCatIds: number[],
    excludeIds: number[],
  ): Promise<number[]> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .innerJoin(
        'product.categories',
        'category',
        'category.id IN (:...catIds)',
        {
          catIds: poolCatIds,
        },
      )
      .select('product.id', 'id')
      .addSelect(
        'MAX(CASE WHEN category.id IN (:...exactCatIds) THEN 1 ELSE 0 END)',
        'exact',
      )
      .where('product.id != :productId', { productId: product.id })
      .andWhere(availableSql('product'));
    if (excludeIds.length) {
      qb.andWhere('product.id NOT IN (:...excludeIds)', { excludeIds });
    }
    const rows = await qb
      .groupBy('product.id')
      .orderBy('exact', 'DESC')
      // در بین هم‌رده‌ها، نزدیک‌ترین قیمت‌ها وارد استخر شوند
      .addOrderBy('ABS(product.price - :basePrice)', 'ASC')
      .addOrderBy('product.id', 'DESC')
      .setParameter('basePrice', product.price)
      .setParameter('exactCatIds', exactCatIds)
      .limit(SIMILAR_POOL_SIZE)
      .getRawMany<SharedCategoryRow>();
    return rows.map((r) => Number(r.id));
  }

  /** میانگین «بهترین شباهت» هر دسته‌ی محصول هدف با دسته‌های نامزد (۰..۱) */
  private similarityToTarget(
    candidate: Product,
    targetCats: number[],
    tree: Map<number, number | null> | null,
  ): number {
    const cats = (candidate.categories ?? []).map((c) => c.id);
    if (!cats.length || !targetCats.length) return 0;
    let sum = 0;
    for (const t of targetCats) {
      let best = 0;
      for (const c of cats) {
        best = Math.max(best, this.categorySimilarity(c, t, tree));
      }
      sum += best;
    }
    return sum / targetCats.length;
  }

  // ─────────────────────────────────────────────────────────────
  // «اغلب همراه این محصول خریده شده» (Co-Purchase با lift)
  // lift = P(همراه‌بودن | خرید هدف) ÷ P(خرید محصول همراه)
  // محصول پرفروشِ عمومی که با همه خریده می‌شود جریمه می‌شود.
  // فقط سفارش‌های PAID؛ مرتب‌سازی با Map (بدون join خطی در JS)
  // ─────────────────────────────────────────────────────────────
  async getFrequentlyBoughtTogether(
    productId: number,
    limit = 8,
  ): Promise<(Product & { purchasedTogether: number })[]> {
    limit = clampLimit(limit, 8);
    // سفارش‌های PAID دارای محصول هدف (جدیدترین‌ها)
    const targetOrderRows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o', 'o.status = :paid', {
        paid: OrderStatus.PAID,
      })
      .select('o.id', 'orderId')
      .addSelect('o.paidAt', 'paidAt')
      .where('oi.productId = :productId', { productId })
      .groupBy('o.id')
      .addGroupBy('o.paidAt')
      .orderBy('o.id', 'DESC')
      .limit(MAX_RECENT_ORDERS)
      .getRawMany<OrderIdRow>();

    if (!targetOrderRows.length) return [];
    const orderIds = targetOrderRows.map((r) => Number(r.orderId));

    // مخرج lift باید روی همان بازه‌ی زمانیِ سفارش‌های هدف محاسبه شود.
    // (سفارش‌های هدف با id نزولی محدود شده‌اند؛ قدیمی‌ترین paidAt همان بازه است.)
    const windowStart = targetOrderRows.reduce<Date | null>((min, row) => {
      if (!row.paidAt) return min;
      const at = new Date(row.paidAt);
      if (Number.isNaN(at.getTime())) return min;
      return !min || at < min ? at : min;
    }, null);

    // کل سفارش‌های PAID در همان بازه (مخرج lift)
    const totalQb = this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o', 'o.status = :paid', {
        paid: OrderStatus.PAID,
      })
      .select('COUNT(DISTINCT o.id)', 'totalOrders');
    if (windowStart) {
      totalQb.andWhere('o.paidAt >= :windowStart', { windowStart });
    }
    const totalRow = await totalQb.getRawOne<TotalOrdersRow>();
    const totalPaidOrders = Number(totalRow?.totalOrders ?? 0);
    if (!totalPaidOrders) return [];

    // بسامد همراه‌بودن در همان سفارش‌ها
    const coRows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o', 'o.status = :paid', {
        paid: OrderStatus.PAID,
      })
      .select('oi.productId', 'productId')
      .addSelect('COUNT(DISTINCT o.id)', 'frequency')
      .where('o.id IN (:...orderIds)', { orderIds })
      .andWhere('oi.productId != :productId', { productId })
      .groupBy('oi.productId')
      .orderBy('frequency', 'DESC')
      .limit(CO_PURCHASE_POOL_SIZE)
      .getRawMany<ProductFrequencyRow>();

    if (!coRows.length) return [];

    // تعداد سفارش‌های دارای هر محصول همراه، در همان بازه‌ی زمانی
    const coIds = coRows.map((r) => Number(r.productId));
    const pQb = this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o', 'o.status = :paid', {
        paid: OrderStatus.PAID,
      })
      .select('oi.productId', 'productId')
      .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
      .where('oi.productId IN (:...coIds)', { coIds });
    if (windowStart) {
      pQb.andWhere('o.paidAt >= :windowStart', { windowStart });
    }
    const pRows = await pQb
      .groupBy('oi.productId')
      .getRawMany<ProductOrderCountRow>();
    const ordersWithP = new Map<number, number>(
      pRows.map((r) => [Number(r.productId), Number(r.orderCount)]),
    );

    const n = orderIds.length;
    const ranked = coRows.map((r) => {
      const freq = Number(r.frequency);
      const pTotal = ordersWithP.get(Number(r.productId)) ?? freq;
      const lift = freq / n / (pTotal / totalPaidOrders);
      return { productId: Number(r.productId), freq, lift };
    });

    // حداقل بسامد برای اعتبار؛ اگر داده کافی نبود، همان فرکانس خام
    const strong = ranked.filter((x) => x.freq >= MIN_CO_SUPPORT);
    const shortlist = (strong.length ? strong : ranked)
      .sort((a, b) => b.lift - a.lift || b.freq - a.freq)
      .slice(0, limit * OVERFETCH_FACTOR);

    // محصول ناموجود پیشنهاد نمی‌شود (ترتیب lift حفظ می‌شود)
    const availableIds = await this.availableIdsAmong(
      shortlist.map((x) => x.productId),
    );
    const finalList = shortlist
      .filter((x) => availableIds.has(x.productId))
      .slice(0, limit);
    if (!finalList.length) return [];

    const products = await this.productRepo.findBy({
      id: In(finalList.map((x) => x.productId)),
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return finalList
      .map((x) => {
        const product = byId.get(x.productId);
        return product
          ? Object.assign(product, { purchasedTogether: x.freq })
          : null;
      })
      .filter((x): x is Product & { purchasedTogether: number } => !!x);
  }

  // ─────────────────────────────────────────────────────────────
  // پرفروش‌ترین‌ها (فقط سفارش‌های PAID) — cold start هم همین‌جا حل می‌شود
  // ─────────────────────────────────────────────────────────────
  async getTopSellingProducts(limit = DEFAULT_LIMIT): Promise<Product[]> {
    limit = clampLimit(limit);
    const want = limit * OVERFETCH_FACTOR;

    // ابتدا پرفروش‌های پنجره‌ی اخیر؛ اگر کم بود با فروش کلی تکمیل می‌شود
    const since = new Date(Date.now() - TOP_SELLING_WINDOW_DAYS * 86_400_000);
    const ids = await this.topSoldIds(want, since);
    if (ids.length < want) {
      for (const id of await this.topSoldIds(want)) {
        if (!ids.includes(id)) ids.push(id);
      }
    }

    const availableIds = ids.length
      ? await this.availableIdsAmong(ids)
      : new Set<number>();
    const finalIds = ids.filter((id) => availableIds.has(id)).slice(0, limit);

    if (!finalIds.length) {
      // هنوز فروشی ثبت نشده → جدیدترین محصولات موجود
      return this.productRepo
        .createQueryBuilder('product')
        .where(availableSql('product'))
        .orderBy('product.createdAt', 'DESC')
        .addOrderBy('product.id', 'DESC')
        .limit(limit)
        .getMany();
    }

    const products = await this.productRepo.findBy({ id: In(finalIds) });
    const byId = new Map(products.map((p) => [p.id, p]));

    // حفظ ترتیب پرفروش
    return finalIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  }

  /** شناسه‌ی پرفروش‌ترین محصولات (مجموع تعداد فروش سفارش‌های PAID)، اختیاراً از تاریخی به بعد */
  private async topSoldIds(max: number, since?: Date): Promise<number[]> {
    const qb = this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o', 'o.status = :paid', {
        paid: OrderStatus.PAID,
      })
      .select('oi.productId', 'productId')
      .addSelect('SUM(oi.quantity)', 'totalSold');
    if (since) qb.where('o.paidAt >= :since', { since });
    const rows = await qb
      .groupBy('oi.productId')
      .orderBy('totalSold', 'DESC')
      .addOrderBy('oi.productId', 'DESC')
      .limit(max)
      .getRawMany<TotalSoldRow>();
    return rows.map((r) => Number(r.productId));
  }

  /** زیرمجموعه‌ی «موجود» از شناسه‌های داده‌شده */
  private async availableIdsAmong(ids: number[]): Promise<Set<number>> {
    if (!ids.length) return new Set<number>();
    const rows = await this.productRepo
      .createQueryBuilder('product')
      .select('product.id', 'id')
      .where('product.id IN (:...ids)', { ids })
      .andWhere(availableSql('product'))
      .getRawMany<{ id: string | number }>();
    return new Set(rows.map((r) => Number(r.id)));
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  /** سیگنال‌های خرید کاربر — فقط سفارش‌های PAID */
  private getPurchaseSignals(userId: number): Promise<OrderItem[]> {
    return (
      this.orderItemRepo
        .createQueryBuilder('oi')
        // innerJoinAndSelect: بدون select کردن سفارش، oi.order خالی می‌ماند و
        // تاریخ خرید (paidAt) گم می‌شد → decay تقریباً صفر و سیگنال خرید بی‌اثر
        .innerJoinAndSelect('oi.order', 'o', 'o.status = :paid', {
          paid: OrderStatus.PAID,
        })
        .innerJoin('o.user', 'u', 'u.id = :userId', { userId })
        .leftJoinAndSelect('oi.product', 'product')
        .leftJoinAndSelect('product.categories', 'category')
        .getMany()
    );
  }

  /**
   * decay نمایی با نیم‌عمر: سیگنال امروز کامل، سیگنالِ قدیمی‌تر کم‌رنگ‌تر.
   * علاقه‌مندی‌ها کهنه می‌شوند و پروفایل باید از آن‌ها پیروی کند.
   */
  private decay(
    at: Date | string | null | undefined,
    halfLifeDays: number,
  ): number {
    // تاریخ نامعلوم ≠ تازه‌ترین؛ وزن کم می‌دهیم تا سیگنال بی‌تاریخ ضعیف عمل کند
    if (!at) return 0.1;
    const ageDays = Math.max(
      0,
      (Date.now() - new Date(at).getTime()) / 86_400_000,
    );
    return Math.pow(0.5, ageDays / halfLifeDays);
  }

  /** تعداد اسلات‌های «کشف» برای شکستن حباب فیلتر (~۲۵٪ لیست) */
  private discoverySlots(limit: number): number {
    return Math.min(Math.ceil(limit * 0.25), Math.floor(limit / 2));
  }

  /** بارگذاری (با کش کوتاه) نگاشت دسته → والد؛ بدون categoryRepo مقدار null */
  private async loadCategoryTree(): Promise<Map<number, number | null> | null> {
    if (!this.categoryRepo) return null;
    const now = Date.now();
    if (this.treeCache && now - this.treeCache.at < TREE_CACHE_TTL_MS) {
      return this.treeCache.map;
    }
    const rows = await this.categoryRepo.find({
      select: { id: true, parentId: true },
    });
    const map = new Map<number, number | null>(
      rows.map((c) => [c.id, c.parentId ?? null]),
    );
    this.treeCache = { at: now, map };
    return map;
  }

  /** ریشه‌ی یک دسته (بالا رفتن تا والد null؛ سقف ۱۰ پله برای ایمنی در برابر حلقه) */
  private rootOf(tree: Map<number, number | null>, id: number): number {
    let cur = id;
    for (let i = 0; i < 10; i++) {
      const parent = tree.get(cur);
      if (parent == null) return cur;
      cur = parent;
    }
    return cur;
  }

  /** دسته‌های برتر + همه‌ی دسته‌هایی که با آن‌ها والد مشترک دارند (هم‌گروه‌ها) */
  private expandToSiblingCategories(
    topCats: number[],
    tree: Map<number, number | null> | null,
  ): number[] {
    if (!tree) return topCats;
    const groups = new Set<number>();
    for (const id of topCats) {
      const parent = tree.get(id);
      if (parent != null) groups.add(parent);
    }
    const expanded = new Set<number>(topCats);
    for (const [id, parent] of tree) {
      if (parent != null && groups.has(parent)) expanded.add(id);
    }
    return [...expanded];
  }

  /** همه‌ی دسته‌هایی که ریشه‌ی مشترک با دسته‌های هدف دارند */
  private expandToSameRoot(
    targetCats: number[],
    tree: Map<number, number | null>,
  ): number[] {
    const roots = new Set(targetCats.map((id) => this.rootOf(tree, id)));
    return [...tree.keys()].filter((id) => roots.has(this.rootOf(tree, id)));
  }

  /**
   * شباهت دو دسته‌بندی در درخت: همان دسته ۱، هم‌گروه ۰٫۵، هم‌ریشه ۰٫۲۵، وگرنه ۰
   * (بدون درخت فقط «همان دسته» شباهت دارد)
   */
  private categorySimilarity(
    a: number,
    b: number,
    tree: Map<number, number | null> | null,
  ): number {
    if (a === b) return 1;
    if (!tree) return 0;
    const parentA = tree.get(a);
    if (parentA != null && parentA === tree.get(b))
      return SIMILARITY_SAME_PARENT;
    return this.rootOf(tree, a) === this.rootOf(tree, b)
      ? SIMILARITY_SAME_ROOT
      : 0;
  }

  /**
   * امتیاز یک دسته‌بندی نسبت به پروفایل علاقه‌مندی:
   * مجموع (علاقه‌ی دسته‌ی پروفایل × شباهت درختی).
   */
  private categoryScore(
    catId: number,
    affinity: Map<number, number>,
    tree: Map<number, number | null> | null,
  ): number {
    let score = 0;
    for (const [profileCat, weight] of affinity) {
      score += weight * this.categorySimilarity(profileCat, catId, tree);
    }
    return score;
  }

  /**
   * fallback محصولات مشابه برای محصول بی‌دسته: نزدیک‌ترین قیمت‌ها.
   * ترکیب take + join + orderBy روی عبارت ABS(...) در TypeORM خطا می‌داد
   * ("alias was not found")؛ پس اول فقط شناسه‌ها با limit خام مرتب می‌شوند
   * و بعد محصولات (با دسته‌ها) بارگذاری و به همان ترتیب برگردانده می‌شوند.
   */
  private async getByPriceRange(
    price: number,
    excludeId: number,
    limit: number,
  ): Promise<Product[]> {
    const margin = price > 0 ? price * 0.3 : 0;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .addSelect('ABS(p.price - :price)', 'priceDiff');

    if (margin > 0) {
      qb.where('p.price BETWEEN :min AND :max', {
        min: price - margin,
        max: price + margin,
      });
    } else {
      qb.where('1 = 1');
    }

    const rows = await qb
      .andWhere('p.id != :excludeId', { excludeId })
      .andWhere(availableSql('p'))
      .setParameter('price', price)
      .orderBy('priceDiff', 'ASC')
      .addOrderBy('p.id', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string | number }>();

    if (!rows.length) return [];
    const ids = rows.map((r) => Number(r.id));
    const products = await this.productRepo.find({
      where: { id: In(ids) },
      relations: { categories: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  }
}
