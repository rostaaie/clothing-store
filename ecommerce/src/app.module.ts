import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AddressModule } from './address/address.module';
import { TicketModule } from './ticket/ticket.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BookmarkProductsModule } from './bookmark_products/bookmark_products.module';
import { BasketItemsModule } from './basket_items/basket_items.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { WalletModule } from './wallet/wallet.module';
import { DiscountCodeModule } from './discount_code/discount_code.module';
import { LoggerMiddleware } from './middlewares/logger/logger.middleware';
import { IpTrackerMiddleware } from './ip-tracker/ip-tracker.middleware';
import { IpTrackerModule } from './ip-tracker/ip-tracker.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { RecommenderModule } from './recommender/recommender.module';
import { RestoreRequestModule } from './restore-request/restore-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity.{js,ts}'],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),

    IpTrackerModule,
    UsersModule,
    AuthModule,
    AddressModule,
    TicketModule,
    ProductsModule,
    CategoriesModule,
    BookmarkProductsModule,
    BasketItemsModule,
    OrdersModule,
    PaymentModule,
    WalletModule,
    DiscountCodeModule,
    RecommenderModule,
    RestoreRequestModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // گارد JWT برای همه روت‌ها به صورت سراسری
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      // گارد نقش (admin/user) برای همه روت‌ها به صورت سراسری
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
    // Rate limiting فقط روی روت‌های حساس (احراز هویت، سفارش، پرداخت، کیف پول)
    // روت‌های فقط-خواندنی مانند products و categories نیازی به rate limiting ندارند
    consumer.apply(IpTrackerMiddleware).forRoutes('auth', 'orders', 'wallet');
  }
}
