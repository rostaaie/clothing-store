import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // اطمینان از وجود پوشه uploads قبل از سرو کردن آن
  fs.mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });

  // سرو کردن فایل‌های آپلودشده (عکس محصولات/دسته‌بندی‌ها) روی مسیر /uploads/...
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // فعال کردن CORS برای ارتباط با فرانت‌اند
  app.enableCors();

  // Validation pipe سراسری با تنظیمات بهتر
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // فیلدهای اضافی را حذف می‌کند
      forbidNonWhitelisted: false,
      transform: true, // تبدیل خودکار نوع (string به number و ...)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // تنظیمات Swagger
  const config = new DocumentBuilder()
    .setTitle('فروشگاه اینترنتی - API')
    .setDescription(
      'مستندات کامل API برای سیستم فروشگاه اینترنتی با امکانات: احراز هویت، محصولات، سفارشات، کیف پول، تیکت و سیستم پیشنهاد',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'توکن JWT را اینجا وارد کنید',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'ثبت‌نام و ورود')
    .addTag('Products', 'مدیریت محصولات')
    .addTag('Categories', 'مدیریت دسته‌بندی‌ها')
    .addTag('Users', 'مدیریت کاربران (ادمین)')
    .addTag('Address', 'مدیریت آدرس‌ها')
    .addTag('Basket', 'سبد خرید')
    .addTag('Bookmarks', 'محصولات نشانه‌گذاری‌شده')
    .addTag('Orders', 'مدیریت سفارشات')
    .addTag('Wallet', 'کیف پول')
    .addTag('Tickets', 'سیستم پشتیبانی')
    .addTag('Discount Codes', 'کدهای تخفیف')
    .addTag('Recommender', 'سیستم پیشنهاد محصول')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // توکن بعد از رفرش صفحه حفظ می‌شود
    },
  });

  const port = process.env.PORT ?? 3000;
await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}
bootstrap();
