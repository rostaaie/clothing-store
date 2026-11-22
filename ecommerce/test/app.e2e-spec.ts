import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * تست E2E — کل اپلیکیشن از طریق HTTP (مثل یه کاربر واقعی)
 *
 * نکته‌ها:
 * - روی دیتابیس اصلی (nest_ecommerce) با دیتای یکتا اجرا می‌شود
 * - همه دیتاهایی که تست می‌سازد در afterAll پاک می‌شوند
 * - ادمین سید (09111111111 / Test123!) برای تست روت‌های ادمین استفاده می‌شود
 */
describe('فروشگاه آنلاین (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // دیتای یکتا برای هر اجرا تا با دیتای موجود تداخل نکند
  const unique = String(Date.now()).slice(-9);
  const userMobile = '09' + unique;
  const USER_PASS = 'Test123!';
  const ADMIN_MOBILE = '09111111111';
  const ADMIN_PASS = 'Test123!';

  // شناسه‌های ساخته‌شده توسط تست (برای پاکسازی)
  const created: {
    orders: number[];
    addresses: number[];
    products: number[];
    categories: number[];
    userId: number;
  } = {
    orders: [],
    addresses: [],
    products: [],
    categories: [],
    userId: 0,
  };

  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // همان ValidationPipe ای که در main.ts استفاده می‌شود
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // ── پاکسازی خودکار همه دیتای ساخته‌شده توسط تست ──
    if (dataSource) {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      try {
        if (created.orders.length) {
          const ids = created.orders.join(',');
          await dataSource.query(
            `DELETE FROM order_items WHERE orderId IN (${ids})`,
          );
          await dataSource.query(`DELETE FROM orders WHERE id IN (${ids})`);
        }
        if (created.userId) {
          await dataSource.query(
            `DELETE FROM basket_items WHERE userId = ${created.userId}`,
          );
          await dataSource.query(
            `DELETE FROM bookmark_products WHERE userId = ${created.userId}`,
          );
          await dataSource.query(
            `DELETE FROM product_views WHERE userId = ${created.userId}`,
          );
          await dataSource.query(
            `DELETE FROM wallet_transaction WHERE walletId IN (SELECT id FROM wallet WHERE userId = ${created.userId})`,
          );
          await dataSource.query(
            `DELETE FROM wallet WHERE userId = ${created.userId}`,
          );
          await dataSource.query(
            `DELETE FROM tickets WHERE userId = ${created.userId}`,
          );
          await dataSource.query(
            `DELETE FROM addresses WHERE id IN (${created.addresses.join(',') || 0})`,
          );
          await dataSource.query(
            `DELETE FROM users WHERE id = ${created.userId}`,
          );
        }
        if (created.products.length) {
          const ids = created.products.join(',');
          await dataSource.query(
            `DELETE FROM product_category WHERE product_id IN (${ids})`,
          );
          await dataSource.query(
            `DELETE FROM product_views WHERE productId IN (${ids})`,
          );
          await dataSource.query(`DELETE FROM products WHERE id IN (${ids})`);
        }
        if (created.categories.length) {
          await dataSource.query(
            `DELETE FROM categories WHERE id IN (${created.categories.join(',')})`,
          );
        }
      } finally {
        await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      }
    }
    await app.close();
  });

  const login = async (mobile: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ mobile, password });
    return res.body?.data?.accessToken ?? res.body?.accessToken;
  };

  // ═══════════ ۱) سلامت و احراز هویت ═══════════
  describe('احراز هویت', () => {
    it('GET / → 200', async () => {
      await request(app.getHttpServer()).get('/').expect(200);
    });

    it('ثبت‌نام کاربر جدید → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          mobile: userMobile,
          password: USER_PASS,
          display_name: 'کاربر E2E',
        });
      expect(res.status).toBe(201);
      created.userId = res.body?.data?.id ?? res.body?.id;
      expect(created.userId).toBeTruthy();
    });

    it('لاگین با رمز اشتباه → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ mobile: userMobile, password: 'wrong-pass' })
        .expect(401);
    });

    it('لاگین کاربر → توکن', async () => {
      userToken = await login(userMobile, USER_PASS);
      expect(userToken).toBeTruthy();
    });

    it('لاگین ادمین → توکن', async () => {
      adminToken = await login(ADMIN_MOBILE, ADMIN_PASS);
      expect(adminToken).toBeTruthy();
    });
  });

  // ═══════════ ۱.۵) Refresh Token ═══════════
  describe('refresh token (تازه‌سازی توکن)', () => {
    let refreshToken: string;

    it('لاگین → refreshToken هم برمی‌گردد', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ mobile: userMobile, password: USER_PASS })
        .expect(200);
      const data = res.body?.data;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      refreshToken = data.refreshToken;
      expect(refreshToken).toBeTruthy();
    });

    it('با refreshToken → توکن تازه + refreshToken جدید (rotation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      const data = res.body?.data;
      expect(data.accessToken).toBeTruthy();
      expect(data.refreshToken).toBeTruthy();
      // چرخش: توکن جدید با قدیمی فرق دارد — مصرف یکباره
      expect(data.refreshToken).not.toBe(refreshToken);
      // accessToken تازه باید معتبر باشد
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${data.accessToken}`)
        .expect(200);
      refreshToken = data.refreshToken;
    });

    it('استفاده مجدد از توکن قدیمی (بعد از rotation) → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      const oldToken = refreshToken;
      refreshToken = res.body?.data?.refreshToken;
      // حالا توکن قبلی باید رد شود چون replaced شده
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldToken })
        .expect(401);
    });

    it('refresh با توکن نامعتبر → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });

    it('logout → توکن باطل می‌شود و دیگر برای refresh قابل استفاده نیست', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  // ═══════════ ۲) گاردها و نقش‌ها ═══════════
  describe('کنترل دسترسی', () => {
    it('بدون توکن → 401', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('توکن کاربر → پروفایل', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.mobile).toBe(userMobile);
      expect(res.body.data).not.toHaveProperty('password'); // نشت پسورد نباشد
    });

    it('کاربر عادی روی روت ادمین → 403', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('ادمین روی روت ادمین → 200', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ═══════════ ۳) کاتالوگ (ادمین) ═══════════
  describe('محصولات و دسته‌بندی‌ها', () => {
    it('ایجاد دسته توسط ادمین → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'دسته E2E ' + unique })
        .expect(201);
      created.categories.push(res.body?.data?.id ?? res.body?.id);
    });

    it('ایجاد محصول توسط ادمین → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'محصول E2E',
          description: 'توضیح تست E2E',
          price: 150000,
          stock: 20,
          categoryIds: created.categories,
        })
        .expect(201);
      created.products.push(res.body?.data?.id ?? res.body?.id);
    });

    it('کاربر عادی نمی‌تواند محصول بسازد → 403', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'x', description: 'y', price: 1, stock: 1 })
        .expect(403);
    });

    it('لیست محصولات عمومی → شامل محصول تست', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);
      const list = res.body?.data ?? res.body;
      expect(list.some((p: any) => created.products.includes(p.id))).toBe(true);
    });
  });

  // ═══════════ ۴) سیستم پیشنهاد ═══════════
  describe('سیستم پیشنهاد', () => {
    it('پرفروش‌ها (عمومی) → 200 با آرایه', async () => {
      const res = await request(app.getHttpServer())
        .get('/recommender/top-selling')
        .expect(200);
      const list = res.body?.data ?? res.body;
      expect(Array.isArray(list)).toBe(true);
    });

    it('محصولات مشابه → 200', async () => {
      await request(app.getHttpServer())
        .get(`/recommender/similar/${created.products[0]}`)
        .expect(200);
    });

    it('پیشنهاد برای من (لاگین) → 200', async () => {
      await request(app.getHttpServer())
        .get('/recommender/for-me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  // ═══════════ ۵) جریان کامل خرید ═══════════
  describe('سفارش و پرداخت', () => {
    let addressId: number;
    let orderId: number;
    let authority: string;

    it('ایجاد آدرس → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/address')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          province: 'تهران',
          city: 'تهران',
          adress: 'خیابان E2E',
          postal_code: '1234567890',
          reciver_mobile: userMobile,
        })
        .expect(201);
      addressId = res.body?.data?.id ?? res.body?.id;
      created.addresses.push(addressId);
    });

    it('افزودن به سبد → 201', async () => {
      await request(app.getHttpServer())
        .post('/basket-items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: created.products[0], quantity: 1 })
        .expect(201);
    });

    it('ایجاد سفارش → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ addressId })
        .expect(201);
      orderId = res.body.orderId;
      created.orders.push(orderId);
    });

    it('درخواست پرداخت → Authority صادر می‌شود', async () => {
      const res = await request(app.getHttpServer())
        .post(`/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);
      authority = res.body.authority;
      expect(authority).toBeTruthy();
    });

    it('تایید با Authority نادرست → 400 (امنیت)', async () => {
      await request(app.getHttpServer())
        .get('/orders/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ orderId, Authority: 'WRONG' })
        .expect(400);
    });

    it('تایید با Authority درست → پرداخت موفق', async () => {
      const res = await request(app.getHttpServer())
        .get('/orders/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ orderId, Authority: authority })
        .expect(200);
      expect(res.body.message).toBe('پرداخت موفق');
    });

    it('سفارش پرداخت‌شده وضعیت PAID دارد', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.status).toBe('PAID');
    });
  });

  // ═══════════ ۶) کیف پول ═══════════
  describe('کیف پول', () => {
    it('شارژ → موجودی افزایش می‌یابد', async () => {
      const res = await request(app.getHttpServer())
        .post('/wallet/deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 200000 })
        .expect(201);
      expect(res.body.balance).toBeGreaterThanOrEqual(200000);
    });

    it('برداشت بیشتر از موجودی → 400', async () => {
      await request(app.getHttpServer())
        .post('/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 999999999 })
        .expect(400);
    });

    it('کیف پول من → 200', async () => {
      await request(app.getHttpServer())
        .get('/wallet/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  // ═══════════ ۷) دسترسی به سفارش دیگران ═══════════
  describe('امنیت مالکیت سفارش', () => {
    it('کاربر دیگر نمی‌تواند سفارش من را ببیند → 403', async () => {
      // یوزر دوم بساز و لاگین کن
      const mobile2 = '0911111' + String(Date.now()).slice(-4);
      await request(app.getHttpServer()).post('/auth/register').send({
        mobile: mobile2,
        password: USER_PASS,
        display_name: 'کاربر دوم E2E',
      });
      const token2 = await login(mobile2, USER_PASS);
      const myOrderId = created.orders[0];

      await request(app.getHttpServer())
        .get(`/orders/${myOrderId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      // یوزر دوم هم پاک شود
      const user2 = await dataSource.query(
        `SELECT id FROM users WHERE mobile = '${mobile2}'`,
      );
      if (user2[0]) {
        await dataSource.query(`DELETE FROM users WHERE id = ${user2[0].id}`);
      }
    });
  });
});
