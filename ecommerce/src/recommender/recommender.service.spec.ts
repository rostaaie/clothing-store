import { RecommenderService } from './recommender.service';

describe('RecommenderService', () => {
  let service: RecommenderService;

  // --- mock ها ---
  const productRepo: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    findBy: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const orderItemRepo: any = { createQueryBuilder: jest.fn() };
  const productViewRepo: any = { find: jest.fn() };
  const bookmarkRepo: any = { find: jest.fn() };

  // ساخت query builder زنجیره‌ای
  const mockQb = (result: any, getManyResult?: any, rawOneResult?: any) => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(getManyResult ?? result),
      getRawMany: jest.fn().mockResolvedValue(result),
      getRawOne: jest.fn().mockResolvedValue(rawOneResult),
    };
    return qb;
  };

  const now = new Date();

  beforeEach(() => {
    // resetAllMocks پیاده‌سازی‌های Once مصرف‌نشده را هم پاک می‌کند
    // (clearAllMocks این کار را نمی‌کند و بین تست‌ها نشت می‌کرد)
    jest.resetAllMocks();

    // پیش‌فرض‌های امن: هر کوئری خالی برمی‌گرداند تا تست‌ها مستقل باشند
    productRepo.findOne.mockResolvedValue(null);
    productRepo.find.mockResolvedValue([]);
    productRepo.findBy.mockResolvedValue([]);
    productRepo.createQueryBuilder.mockImplementation(() => mockQb([], []));
    orderItemRepo.createQueryBuilder.mockImplementation(() => mockQb([]));
    productViewRepo.find.mockResolvedValue([]);
    bookmarkRepo.find.mockResolvedValue([]);

    service = new RecommenderService(
      productRepo,
      orderItemRepo,
      productViewRepo,
      bookmarkRepo,
    );

    // «موجودی» در تست‌های منطق رتبه‌بندی خنثی است (همه‌چیز موجود فرض می‌شود)؛
    // خودِ فیلتر موجودی در describe جداگانه‌ی پایین تست می‌شود
    jest
      .spyOn(service as any, 'availableIdsAmong')
      .mockImplementation(async (ids: number[]) => new Set(ids));
  });

  // ═══════════════ getSimilarProducts (محصولات مشابه) ═══════════════
  describe('getSimilarProducts', () => {
    it('محصول اصلی یافت نشود → []', async () => {
      const result = await service.getSimilarProducts(99);

      expect(result).toEqual([]);
    });

    it('محصول بدون دسته‌بندی → پیشنهاد بر اساس قیمت نزدیک', async () => {
      productRepo.findOne.mockResolvedValue({
        id: 1,
        price: 100000,
        categories: [],
      });
      const qb = mockQb([{ id: '2' }]);
      productRepo.createQueryBuilder.mockReturnValueOnce(qb);
      productRepo.find.mockResolvedValueOnce([
        { id: 2, price: 90000, categories: [] },
      ]);

      const result = await service.getSimilarProducts(1, 8);

      expect(productRepo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(qb.where).toHaveBeenCalledWith(
        'p.price BETWEEN :min AND :max',
        expect.any(Object),
      );
      expect(qb.andWhere).toHaveBeenCalledWith('p.id != :excludeId', {
        excludeId: 1,
      });
      // ترتیب با شناسه‌های خام + limit (نه take روی عبارت ABS) تعیین می‌شود
      expect(qb.limit).toHaveBeenCalledWith(8);
      expect(qb.getRawMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('استخر نامزدها در SQL محدود است (limit روی کوئری)', async () => {
      productRepo.findOne.mockResolvedValue({
        id: 1,
        price: 100000,
        categories: [{ id: 1 }],
      });
      const qb = mockQb([]);
      productRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.getSimilarProducts(1);

      expect(qb.limit).toHaveBeenCalled();
      expect(qb.groupBy).toHaveBeenCalledWith('product.id');
    });

    it('رتبه‌بندی: اشتراک دسته بیشتر مقدم است و نزدیکی قیمت تساوی‌شکن', async () => {
      productRepo.findOne.mockResolvedValue({
        id: 1,
        price: 100000,
        categories: [{ id: 1 }, { id: 2 }],
      });
      // استخر SQL: محصول ۴ دو دسته مشترک، محصول ۲ یک دسته
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb([
          { id: '4', shared: '2' },
          { id: '2', shared: '1' },
        ]),
      );
      productRepo.find.mockResolvedValue([
        { id: 2, price: 90000, categories: [{ id: 1 }] },
        { id: 4, price: 100000, categories: [{ id: 1 }, { id: 2 }] },
      ]);

      const result = await service.getSimilarProducts(1, 2);

      expect(result.map((p) => p.id)).toEqual([4, 2]);
    });

    it('با اشتراک دسته برابر، قیمت نزدیک‌تر اول است', async () => {
      productRepo.findOne.mockResolvedValue({
        id: 1,
        price: 100000,
        categories: [{ id: 1 }],
      });
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb([
          { id: '2', shared: '1' },
          { id: '3', shared: '1' },
        ]),
      );
      productRepo.find.mockResolvedValue([
        { id: 2, price: 90000, categories: [{ id: 1 }] },
        { id: 3, price: 120000, categories: [{ id: 1 }] },
      ]);

      const result = await service.getSimilarProducts(1, 2);

      expect(result.map((p) => p.id)).toEqual([2, 3]);
    });
  });

  // ═══════════════ getFrequentlyBoughtTogether (خرید همزمان با lift) ═══════════════
  describe('getFrequentlyBoughtTogether', () => {
    it('هیچ سفارش PAID شامل این محصول نباشد → []', async () => {
      const result = await service.getFrequentlyBoughtTogether(1);

      expect(result).toEqual([]);
    });

    it('فقط سفارش‌های PAID شمرده می‌شوند', async () => {
      const qb = mockQb([]);
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.getFrequentlyBoughtTogether(1);

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'oi.order',
        'o',
        'o.status = :paid',
        { paid: 'PAID' },
      );
    });

    it('lift بر فرکانس خام مقدم است: محصول کم‌تکرارِ اختصاصی از پرفروش عمومی جلو می‌زند', async () => {
      // ۱۰ سفارش دارای محصول هدف، ۱۰۰ سفارش PAID در کل سیستم
      const targetOrders = Array.from({ length: 10 }, (_, i) => ({
        orderId: String(i + 1),
      }));
      orderItemRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb(targetOrders)) // ۱) سفارش‌های هدف
        .mockReturnValueOnce(mockQb([], undefined, { totalOrders: '100' })) // ۲) کل سفارش‌ها
        .mockReturnValueOnce(
          // ۳) محصول ۷: ۵ بار همراه | محصول ۸: فقط ۲ بار همراه
          mockQb([
            { productId: '7', frequency: '5' },
            { productId: '8', frequency: '2' },
          ]),
        )
        .mockReturnValueOnce(
          // ۴) محصول ۷ در ۶۰٪ کل سفارش‌ها هست (پرفروش عمومی)، محصول ۸ فقط در ۲٪
          mockQb([
            { productId: '7', orderCount: '60' },
            { productId: '8', orderCount: '2' },
          ]),
        );
      productRepo.findBy.mockResolvedValue([
        { id: 7, title: 'پرفروش عمومی' },
        { id: 8, title: 'اختصاصی' },
      ]);

      const result = await service.getFrequentlyBoughtTogether(1);

      // lift محصول ۸ = (2/10)/(2/100)=10 > lift محصول ۷ = (5/10)/(60/100)≈0.83
      expect(result.map((p) => p.id)).toEqual([8, 7]);
      expect(result[0].purchasedTogether).toBe(2);
      expect(result[1].purchasedTogether).toBe(5);
    });

    it('مخرج lift به همان بازه‌ی زمانی سفارش‌های هدف محدود می‌شود', async () => {
      const paidAt = new Date('2026-01-01T00:00:00.000Z');
      const targetQb = mockQb([{ orderId: '1', paidAt }]);
      const totalQb = mockQb([], undefined, { totalOrders: '50' });
      const coQb = mockQb([{ productId: '7', frequency: '2' }]);
      const pQb = mockQb([{ productId: '7', orderCount: '10' }]);
      orderItemRepo.createQueryBuilder
        .mockReturnValueOnce(targetQb)
        .mockReturnValueOnce(totalQb)
        .mockReturnValueOnce(coQb)
        .mockReturnValueOnce(pQb);
      productRepo.findBy.mockResolvedValue([{ id: 7 }]);

      const result = await service.getFrequentlyBoughtTogether(1);

      expect(result.map((p) => p.id)).toEqual([7]);
      expect(targetQb.addSelect).toHaveBeenCalledWith('o.paidAt', 'paidAt');
      expect(totalQb.andWhere).toHaveBeenCalledWith(
        'o.paidAt >= :windowStart',
        { windowStart: paidAt },
      );
      expect(pQb.andWhere).toHaveBeenCalledWith('o.paidAt >= :windowStart', {
        windowStart: paidAt,
      });
    });

    it('همه بسامدها زیر حداقل باشند → fallback به فرکانس خام بدون خطا', async () => {
      orderItemRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb([{ orderId: '1' }]))
        .mockReturnValueOnce(mockQb([], undefined, { totalOrders: '5' }))
        .mockReturnValueOnce(mockQb([{ productId: '9', frequency: '1' }]))
        .mockReturnValueOnce(mockQb([{ productId: '9', orderCount: '1' }]));
      productRepo.findBy.mockResolvedValue([{ id: 9, title: 'تک' }]);

      const result = await service.getFrequentlyBoughtTogether(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: 9, purchasedTogether: 1 }),
      );
    });
  });

  // ═══════════════ getPersonalizedRecommendations (پیشنهاد شخصی) ═══════════════
  describe('getPersonalizedRecommendations', () => {
    it('cold start: کاربر بدون هیچ سیگنالی → پرفروش‌ترین‌ها (نه آرایه خالی)', async () => {
      // بدون فروش → جدیدترین محصولات «موجود» (کوئری با شرط موجودی)
      const fallbackQb = mockQb([], [{ id: 9, title: 'جدید' }]);
      productRepo.createQueryBuilder.mockReturnValueOnce(fallbackQb);

      const result = await service.getPersonalizedRecommendations(1);

      expect(fallbackQb.limit).toHaveBeenCalledWith(10);
      expect(fallbackQb.where).toHaveBeenCalledWith(
        expect.stringContaining('product_variants'),
      );
      expect(result).toEqual([{ id: 9, title: 'جدید' }]);
    });

    it('سیگنال هست ولی محصولات دسته ندارند → پرفروش‌ها', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productRepo.find.mockResolvedValueOnce([{ id: 1, categories: [] }]); // دسته‌های بوکمارک
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb([], [{ id: 9 }]), // fallback پرفروش/جدیدترین موجود
      );

      const result = await service.getPersonalizedRecommendations(1);

      expect(result).toEqual([{ id: 9 }]);
    });

    it('خرید فقط از سفارش‌های PAID خوانده می‌شود', async () => {
      const purchaseQb = mockQb([], []);
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(purchaseQb);

      await service.getPersonalizedRecommendations(1);

      // innerJoinAndSelect: سفارش باید select شود تا paidAt در دسترس باشد
      expect(purchaseQb.innerJoinAndSelect).toHaveBeenCalledWith(
        'oi.order',
        'o',
        'o.status = :paid',
        { paid: 'PAID' },
      );
    });

    it('تاریخ خرید (paidAt) در وزن‌دهی دیده می‌شود: خرید تازه از بوکمارک تازه قوی‌تر است', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
      // بوکمارک تازه در دسته ۱۰ (وزن ≈ ۲) و خرید ۲ روز پیش در دسته ۲۰ (وزن ≈ ۲٫۹)
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb(
          [],
          [
            {
              quantity: 1,
              order: { paidAt: twoDaysAgo, createdAt: twoDaysAgo },
              product: { id: 2, categories: [{ id: 20 }] },
            },
          ],
        ),
      );
      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);
      const candidates = [
        { id: 11, categories: [{ id: 10 }] },
        { id: 12, categories: [{ id: 20 }] },
      ];
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb(candidates, candidates),
      );

      const result = await service.getPersonalizedRecommendations(1, 10);

      expect(result.map((p) => p.id)).toEqual([12, 11]);
    });

    it('limit نامعتبر یا خیلی بزرگ به بازه‌ی مجاز محدود می‌شود', async () => {
      const qb = mockQb([], []);
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.getTopSellingProducts(100000);

      // سقف ۵۰ نتیجه × ضریب واکشی اضافه (برای حذف محصولات ناموجود)
      expect(qb.limit).toHaveBeenCalledWith(150);
    });

    it('امتیاز دسته‌بندی رتبه می‌سازد: محصول با دسته‌های قوی‌تر بالاتر می‌آید', async () => {
      // بوکمارک تازه در دسته ۱۰ (وزن ۲) + بازدید تازه در دسته ۲۰ (وزن ۱)
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productViewRepo.find.mockResolvedValue([
        { productId: 2, viewCount: 1, lastViewedAt: now },
      ]);

      productRepo.find
        .mockResolvedValueOnce([{ id: 1, categories: [{ id: 10 }] }]) // بوکمارک
        .mockResolvedValueOnce([{ id: 2, categories: [{ id: 20 }] }]); // بازدید

      // نامزدها: A فقط دسته ۱۰، B فقط دسته ۲۰، C هر دو دسته
      const candidates = [
        { id: 11, categories: [{ id: 10 }] },
        { id: 12, categories: [{ id: 20 }] },
        { id: 13, categories: [{ id: 10 }, { id: 20 }] },
      ];
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb(candidates, candidates),
      );

      const result = await service.getPersonalizedRecommendations(1, 10);

      // امتیاز نرمال‌شده: دسته ۱۰ = ۱، دسته ۲۰ = ۰٫۵ → C(1.5) > A(1) > B(0.5)
      expect(result.map((p) => p.id)).toEqual([13, 11, 12]);
    });

    it('خریده/بوکمارک‌شده‌ها از نامزدها حذف می‌شوند (NOT IN)', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(
        // getMany سیگنال‌های خرید را برمی‌گرداند
        mockQb(
          [],
          [
            {
              quantity: 1,
              order: { paidAt: now, createdAt: now },
              product: { id: 2, categories: [] },
            },
          ],
        ),
      );

      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);
      const candidatesQb = mockQb([], []);
      productRepo.createQueryBuilder.mockReturnValueOnce(candidatesQb);

      await service.getPersonalizedRecommendations(1);

      expect(candidatesQb.andWhere).toHaveBeenCalledWith(
        'product.id NOT IN (:...excluded)',
        { excluded: expect.arrayContaining([1, 2]) },
      );
    });

    it('محصول دیده‌شده حذف نمی‌شود؛ فقط جریمه می‌شود', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      // محصول ۲۱ دیده شده
      productViewRepo.find.mockResolvedValue([
        { productId: 21, viewCount: 1, lastViewedAt: now },
      ]);

      productRepo.find
        .mockResolvedValueOnce([{ id: 1, categories: [{ id: 10 }] }])
        .mockResolvedValueOnce([{ id: 21, categories: [{ id: 10 }] }]);

      // دو نامزد هم‌امتیاز در دسته ۱۰؛ یکی دیده‌شده است
      const candidates = [
        { id: 21, categories: [{ id: 10 }] }, // دیده‌شده → جریمه ۰٫۳۵
        { id: 22, categories: [{ id: 10 }] },
      ];
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb(candidates, candidates),
      );

      const result = await service.getPersonalizedRecommendations(1, 10);

      expect(result.map((p) => p.id)).toEqual([22, 21]);
    });

    it('نامزدی نبود → جای خالی با کشف (جدیدترین‌ها) پر می‌شود', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);

      const discovery = [
        { id: 31, categories: [{ id: 99 }] },
        { id: 32, categories: [{ id: 98 }] },
      ];
      productRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb([], [])) // نامزدها: خالی
        .mockReturnValueOnce(mockQb(discovery, discovery)) // کشف خارج از دسته‌ها
        .mockReturnValueOnce(mockQb([], [])); // تکمیل: چیزی نمانده

      const result = await service.getPersonalizedRecommendations(1, 10);

      expect(result.map((p) => p.id)).toEqual([31, 32]);
      expect(productRepo.createQueryBuilder).toHaveBeenCalledTimes(3);
    });

    it('اگر محصولی خارج از دسته‌های محبوب نباشد، فهرست با جدیدترین‌ها تکمیل می‌شود', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);

      // استخر Discovery خارج از دسته‌های محبوب خالی است؛
      // تکمیل باید از جدیدترین محصولات (حتی داخل دسته‌ی محبوب) انجام شود.
      const fallback = [
        { id: 31, categories: [{ id: 10 }] },
        { id: 32, categories: [{ id: 10 }] },
      ];
      productRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb([], [])) // نامزدها: خالی
        .mockReturnValueOnce(mockQb([], [])) // کشف خارج از دسته‌ها: خالی
        .mockReturnValueOnce(mockQb(fallback, fallback)); // تکمیل فهرست

      const result = await service.getPersonalizedRecommendations(1, 10);

      expect(result.map((p) => p.id)).toEqual([31, 32]);
    });

    it('سقف تنوع: یک دسته نمی‌تواند کل لیست را ببلعد', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);

      // ۶ نامزد همه از یک دسته؛ limit=4 → personalTarget=3، سقف هر دسته=2
      const candidates = [41, 42, 43, 44, 45, 46].map((id) => ({
        id,
        categories: [{ id: 10 }],
      }));
      productRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb(candidates, candidates),
      );

      const result = await service.getPersonalizedRecommendations(1, 4);

      // فقط ۲ محصول از دسته ۱۰؛ بقیه لیست از کشف می‌آمد (اینجا خالی)
      const fromCat10 = result.filter((p) => p.categories[0]?.id === 10);
      expect(fromCat10).toHaveLength(2);
      expect(result.length).toBeLessThanOrEqual(4);
    });
  });

  // ═══════════════ getTopSellingProducts (پرفروش‌ها) ═══════════════
  describe('getTopSellingProducts', () => {
    it('فقط سفارش‌های PAID شمرده می‌شوند', async () => {
      const qb = mockQb([]);

      orderItemRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.getTopSellingProducts(10);

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'oi.order',
        'o',
        'o.status = :paid',
        { paid: 'PAID' },
      );
    });

    it('هیچ فروشی ثبت نشده → جدیدترین محصولات به عنوان fallback', async () => {
      const fallbackQb = mockQb([], [{ id: 9, title: 'جدید' }]);
      productRepo.createQueryBuilder.mockReturnValueOnce(fallbackQb);

      const result = await service.getTopSellingProducts(10);

      expect(fallbackQb.orderBy).toHaveBeenCalledWith(
        'product.createdAt',
        'DESC',
      );
      expect(result).toHaveLength(1);
    });

    it('ترتیب پرفروش حفظ می‌شود حتی اگر findBy مرتب برنگرداند', async () => {
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb([
          { productId: '3', totalSold: '15' },
          { productId: '1', totalSold: '9' },
        ]),
      );
      productRepo.findBy.mockResolvedValue([{ id: 1 }, { id: 3 }]); // بی‌ترتیب

      const result = await service.getTopSellingProducts(10);

      expect(result.map((p) => p.id)).toEqual([3, 1]);
    });
  });
  // ═══════════════ شباهت درختی دسته‌بندی‌ها ═══════════════
  describe('getPersonalizedRecommendations با درخت دسته‌بندی', () => {
    // ریشه ۱ › گروه ۲ (برگ‌های ۱۰ و ۱۱) و گروه ۳ (برگ ۲۰)
    const treeRows = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 1 },
      { id: 10, parentId: 2 },
      { id: 11, parentId: 2 },
      { id: 20, parentId: 3 },
    ];

    it('علاقه به یک دسته به هم‌گروه‌ها سرایت می‌کند (هم‌گروه > هم‌ریشه) و استخر نامزدها گسترش می‌یابد', async () => {
      const categoryRepo: any = {
        find: jest.fn().mockResolvedValue(treeRows),
      };
      const svc = new RecommenderService(
        productRepo,
        orderItemRepo,
        productViewRepo,
        bookmarkRepo,
        categoryRepo,
      );
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);
      // ۲۱ هم‌گروهِ دسته‌ی ۱۰، ۲۲ فقط هم‌ریشه (دسته‌ی ۲۰)
      const candidates = [
        { id: 22, categories: [{ id: 20 }] },
        { id: 21, categories: [{ id: 11 }] },
      ];
      const qb = mockQb(candidates, candidates);
      productRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await svc.getPersonalizedRecommendations(1, 10);

      // بدون درخت هر دو امتیاز صفر می‌گرفتند و حذف می‌شدند
      expect(result.map((p) => p.id)).toEqual([21, 22]);
      expect(qb.where).toHaveBeenCalledWith('category.id IN (:...topCats)', {
        topCats: expect.arrayContaining([10, 11]),
      });
    });

    it('بدون categoryRepo رفتار قبلی حفظ می‌شود (فقط تطابق دقیق دسته)', async () => {
      bookmarkRepo.find.mockResolvedValue([
        { product: { id: 1 }, createdAt: now },
      ]);
      productRepo.find.mockResolvedValueOnce([
        { id: 1, categories: [{ id: 10 }] },
      ]);
      const qb = mockQb([], []);
      productRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.getPersonalizedRecommendations(1, 10);

      expect(qb.where).toHaveBeenCalledWith('category.id IN (:...topCats)', {
        topCats: [10],
      });
    });
  });
  // ═══════════════ پنجره‌ی زمانی پرفروش‌ها و موجودی ═══════════════
  describe('پرفروش‌ها: پنجره‌ی اخیر + فیلتر موجودی', () => {
    it('ابتدا پنجره‌ی اخیر (paidAt >= since) سپس تکمیل با فروش کلی، بدون تکرار', async () => {
      const windowQb = mockQb([{ productId: '3', totalSold: '9' }]);
      const allTimeQb = mockQb([
        { productId: '3', totalSold: '20' },
        { productId: '7', totalSold: '12' },
      ]);
      orderItemRepo.createQueryBuilder
        .mockReturnValueOnce(windowQb)
        .mockReturnValueOnce(allTimeQb);
      productRepo.findBy.mockResolvedValue([{ id: 7 }, { id: 3 }]);

      const result = await service.getTopSellingProducts(10);

      expect(windowQb.where).toHaveBeenCalledWith('o.paidAt >= :since', {
        since: expect.any(Date),
      });
      expect(allTimeQb.where).not.toHaveBeenCalled();
      expect(result.map((p) => p.id)).toEqual([3, 7]);
    });

    it('محصول ناموجود از پرفروش‌ها حذف می‌شود و ترتیب بقیه حفظ می‌شود', async () => {
      orderItemRepo.createQueryBuilder.mockReturnValueOnce(
        mockQb([
          { productId: '3', totalSold: '15' },
          { productId: '1', totalSold: '9' },
          { productId: '5', totalSold: '4' },
        ]),
      );
      jest
        .spyOn(service as any, 'availableIdsAmong')
        .mockResolvedValue(new Set([1, 5])); // ۳ ناموجود
      productRepo.findBy.mockResolvedValue([{ id: 5 }, { id: 1 }]);

      const result = await service.getTopSellingProducts(10);

      expect(result.map((p) => p.id)).toEqual([1, 5]);
    });

    it('محصول ناموجود از «اغلب همراه خریداری شده» حذف می‌شود', async () => {
      orderItemRepo.createQueryBuilder
        .mockReturnValueOnce(
          mockQb([{ orderId: '1' }, { orderId: '2' }, { orderId: '3' }]),
        )
        .mockReturnValueOnce(mockQb([], undefined, { totalOrders: '30' }))
        .mockReturnValueOnce(
          mockQb([
            { productId: '7', frequency: '3' },
            { productId: '8', frequency: '2' },
          ]),
        )
        .mockReturnValueOnce(
          mockQb([
            { productId: '7', orderCount: '3' },
            { productId: '8', orderCount: '2' },
          ]),
        );
      jest
        .spyOn(service as any, 'availableIdsAmong')
        .mockResolvedValue(new Set([8])); // ۷ ناموجود
      productRepo.findBy.mockResolvedValue([{ id: 8 }]);

      const result = await service.getFrequentlyBoughtTogether(1);

      expect(result.map((p) => p.id)).toEqual([8]);
    });

    it('availableIdsAmong: شرط موجودی ساده/واریانت‌دار را اعمال و فقط شناسه‌های موجود را برمی‌گرداند', async () => {
      const fresh = new RecommenderService(
        productRepo,
        orderItemRepo,
        productViewRepo,
        bookmarkRepo,
      );
      const qb = mockQb([{ id: '1' }, { id: 5 }]);
      productRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const ids = await (fresh as any).availableIdsAmong([1, 2, 5]);

      expect([...ids].sort()).toEqual([1, 5]);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('product_variants'),
      );
    });
  });
});
