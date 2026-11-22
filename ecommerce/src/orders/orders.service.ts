import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BasketItem } from 'src/basket_items/entities/basket_item.entity';
import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/users/entities/user.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status';
import { OrderItem } from './entities/order-item.entity';
import { DiscountCode } from 'src/discount_code/entities/discount_code.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { WalletTransaction } from 'src/wallet/entities/wallet-transaction.entity';
import { PaymentProviderService } from '../payment/payment-provider.service';
import { TransactionStatus } from 'src/wallet/enums/transaction-status';
import { WalletService } from 'src/wallet/wallet.service';
import { Address } from 'src/address/entities/address.entity';
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(BasketItem) private basketRepo: Repository<BasketItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(DiscountCode)
    private discountRepo: Repository<DiscountCode>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    //@InjectRepository(WalletTransaction) private walletTxRepo: Repository<WalletTransaction>,
    @InjectDataSource() private dataSource: DataSource,
    private paymentProvider: PaymentProviderService,
    private walletService: WalletService,
  ) {}

  async getOrder(orderId: number) {
    return this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user', 'address', 'discountCode'],
    });
  }

  async getUserOrders(userId: number) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'address', 'discountCode'],
      order: { id: 'DESC' },
    });
  }

  /**
   * دریافت همه سفارش‌ها با صفحه‌بندی و فیلتر اختیاری بر اساس وضعیت/کاربر (فقط ادمین)
   */
  async findAllOrders(filters: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
    orderId?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.user = { id: Number(filters.userId) };
    if (filters.orderId) where.id = Number(filters.orderId);

    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['user', 'address', 'items', 'items.product'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: orders,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  // 1- Create Order + Stock Lock
  // paymentMethod: 'GATEWAY' (پیش‌فرض) → سفارش PENDING ساخته می‌شود و پرداخت در ادامه انجام می‌شود
  //                'WALLET' → بلافاصله با کیف پول پرداخت شده و سفارش نهایی (PAID) می‌شود
  async createOrder(
    userId: number,
    addressId: number,
    discountCode?: string,
    paymentMethod: 'GATEWAY' | 'WALLET' = 'GATEWAY',
  ) {
    return await this.dataSource.transaction(async (manager) => {
      // آدرس باید وجود داشته باشد و متعلق به همین کاربر باشد
      const address = await manager.findOne(Address, {
        where: { id: addressId, user: { id: userId } },
      });
      if (!address) {
        throw new BadRequestException(
          'آدرس انتخاب‌شده معتبر نیست یا متعلق به شما نیست',
        );
      }

      const basket = await manager.find(BasketItem, {
        where: { user: { id: userId } },
        relations: ['product', 'variant'],
      });

      if (basket.length === 0) {
        throw new BadRequestException('سبد خرید خالی است');
      }

      let totalPrice = 0;

      for (const item of basket) {
        const product = item.product;

        // اگر آیتم برای یک سایز/رنگ مشخص انتخاب شده، موجودی همان ترکیب چک می‌شود؛
        // در غیر این صورت (محصول ساده بدون variant) موجودی خودِ محصول چک می‌شود
        const stockSource = item.variant || product;
        const available = stockSource.stock - stockSource.reservedStock;
        if (available < item.quantity) {
          throw new BadRequestException(
            `موجودی محصول ${product.title} کافی نیست`,
          );
        }

        totalPrice += product.price * item.quantity;
      }
      ////////////////////
      let discountAmount = 0;
      let appliedDiscount: DiscountCode | null = null;

      if (discountCode) {
        appliedDiscount = await manager.findOne(DiscountCode, {
          where: { code: discountCode },
        });

        if (!appliedDiscount) throw new BadRequestException('کد تخفیف نامعتبر');

        if (appliedDiscount.expireAt && appliedDiscount.expireAt < new Date()) {
          throw new BadRequestException('کد تخفیف منقضی شده');
        }

        if (appliedDiscount.usageCount >= appliedDiscount.maxUsage) {
          throw new BadRequestException('کد تخفیف به سقف استفاده رسیده');
        }

        if (
          appliedDiscount.minPurchaseAmount &&
          totalPrice < appliedDiscount.minPurchaseAmount
        ) {
          throw new BadRequestException(
            'حداقل مبلغ لازم برای استفاده از کد تخفیف رعایت نشده',
          );
        }

        if (appliedDiscount.percent) {
          discountAmount = Math.floor(
            (totalPrice * appliedDiscount.percent) / 100,
          );
        } else if (appliedDiscount.amount) {
          discountAmount = appliedDiscount.amount;
        }

        appliedDiscount.usageCount += 1;
        await manager.save(appliedDiscount);
      }
      ///////
      const finalPrice = Math.max(0, totalPrice - discountAmount);

      for (const item of basket) {
        const stockSource = item.variant || item.product;
        stockSource.reservedStock += item.quantity;
        await manager.save(stockSource);
      }

      const order = manager.create(Order, {
        user: { id: userId },
        address,
        status: OrderStatus.PENDING,
        totalPrice,
        discountAmount,
        finalPrice,
        discountCode: appliedDiscount || undefined,
      });

      await manager.save(order);

      for (const item of basket) {
        const orderItem = manager.create(OrderItem, {
          order,
          product: item.product,
          variant: item.variant || null,
          variantSize: item.variant?.size,
          variantColor: item.variant?.color,
          quantity: item.quantity,
          price: item.product.price,
          total: item.product.price * item.quantity,
        });

        await manager.save(orderItem);
      }

      // اگر روش پرداخت کیف پول انتخاب شده باشد، همان لحظه پرداخت انجام می‌شود
      // (موجودی کافی نباشد کل تراکنش برگشت می‌خورد و سفارشی ساخته نمی‌شود)
      if (paymentMethod === 'WALLET') {
        const { wallet } = await this.chargeWalletWithTx(
          manager,
          userId,
          Number(finalPrice) || 0,
          `پرداخت سفارش #${order.id}`,
          TransactionStatus.ORDER_PAYMENT,
        );

        // نهایی‌سازی سفارش (کسر موجودی، آزادسازی رزرو، پاک‌سازی سبد، ثبت زمان پرداخت، پاداش)
        const fresh = await this.finalizePaidOrder(manager, order.id);

        // موجودی نهایی کیف پول (بعد از اعمال cashback)
        const finalWallet = await manager.getRepository(Wallet).findOne({
          where: { id: wallet.id },
        });

        return {
          message: 'سفارش با موفقیت ثبت و با کیف پول پرداخت شد',
          orderId: fresh.id,
          status: fresh.status,
          totalPrice,
          discountAmount,
          finalPrice,
          wallet: finalWallet,
        };
      }

      return {
        message: 'سفارش با موفقیت ایجاد شد',
        orderId: order.id,
        totalPrice,
        discountAmount,
        finalPrice,
      };
    });
  }

  // Payment Request
  // ------------------------------------------------------
  async requestPayment(orderId: number, userId: number) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('این سفارش قابل پرداخت نیست');
    }

    const payment = await this.paymentProvider.requestPayment(
      order.id,
      order.finalPrice,
    );

    // ثبت درخواست پرداخت روی سفارش تا verify فقط برای سفارش‌هایی پذیرفته شود
    // که واقعاً درخواست پرداخت برایشان ثبت شده و Authority آن‌ها با Authority صادرشده یکی باشد
    order.paymentRequestedAt = new Date();
    order.paymentAuthority = payment.authority || null;
    await this.orderRepo.save(order);

    // Authority صادرشده توسط درگاه را برمی‌گردانیم تا کلاینت (یا callback درگاه)
    // بتواند آن را به verify بدهد؛ در این پروژه درگاه شبیه‌سازی‌شده است.
    return {
      paymentUrl: payment.url,
      authority: payment.authority || null,
    };
  }

  // ------------------------------------------------------
  // Payment Verify
  // ------------------------------------------------------
  async verifyPayment(orderId: number, paymentData: any, userId: number) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) throw new NotFoundException('سفارش یافت نشد');

    // فقط صاحب سفارش می‌تواند پرداخت آن را تایید کند (جلوگیری از IDOR)
    if (order.user?.id !== userId) {
      throw new BadRequestException('این سفارش متعلق به شما نیست');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('این سفارش قابل تایید نیست');
    }

    // باید ابتدا درخواست پرداخت (POST /orders/:id/pay) ثبت شده باشد
    if (!order.paymentRequestedAt || !order.paymentAuthority) {
      throw new BadRequestException(
        'برای این سفارش درخواست پرداختی ثبت نشده است',
      );
    }

    // Authority دریافتی باید دقیقاً همان Authority صادرشده توسط درگاه باشد
    if (
      !paymentData?.Authority ||
      paymentData.Authority !== order.paymentAuthority
    ) {
      throw new BadRequestException('کد پیگیری پرداخت (Authority) نامعتبر است');
    }

    const verify = await this.paymentProvider.verifyPayment(paymentData);

    if (!verify.success) {
      await this.finalizeFailedOrder(order);
      throw new BadRequestException('پرداخت ناموفق');
    }

    return this.finalizeOrder(order);
  }

  // ------------------------------------------------------
  // Finalize Payment
  // ------------------------------------------------------
  async finalizeOrder(order: Order) {
    return await this.dataSource.transaction(async (manager) => {
      const fresh = await this.finalizePaidOrder(manager, order.id);
      return { message: 'پرداخت موفق', orderId: fresh.id };
    });
  }

  // ------------------------------------------------------
  // Shared logic: finalizing a paid order
  // (کسر موجودی، آزادسازی رزرو، پاک‌سازی سبد خرید، ثبت زمان پرداخت، پاداش)
  // توسط درگاه پرداخت و پرداخت با کیف پول استفاده می‌شود
  // ------------------------------------------------------
  private async finalizePaidOrder(manager, orderId: number) {
    const fresh = await manager.findOne(Order, {
      where: { id: orderId },
      relations: ['items', 'items.product', 'items.variant', 'user'],
    });

    if (!fresh) throw new NotFoundException();

    if (fresh.status !== OrderStatus.PENDING) {
      throw new BadRequestException('وضعیت سفارش معتبر نیست');
    }

    for (const item of fresh.items) {
      const stockSource = item.variant || item.product;

      stockSource.stock -= item.quantity;
      stockSource.reservedStock -= item.quantity;

      if (stockSource.stock < 0) stockSource.stock = 0;
      if (stockSource.reservedStock < 0) stockSource.reservedStock = 0;

      await manager.save(stockSource);
    }

    // فقط آیتم‌های سبد خرید که در این سفارش هستند حذف می‌شوند
    // (نه همه آیتم‌های سبد — اگر کاربر سفارش دیگری PENDING داشته باشد حفظ می‌شود)
    const orderProductIds = fresh.items.map((i) => i.product.id);
    if (orderProductIds.length) {
      await manager
        .createQueryBuilder()
        .delete()
        .from(BasketItem)
        .where('userId = :userId', { userId: fresh.user.id })
        .andWhere('productId IN (:...productIds)', {
          productIds: orderProductIds,
        })
        .execute();
    }

    fresh.status = OrderStatus.PAID;
    fresh.paidAt = new Date();
    await manager.save(fresh);

    await this.addCashback(fresh, manager);

    return fresh;
  }

  // ------------------------------------------------------
  // Finalize FAILED payment
  // ------------------------------------------------------
  async finalizeFailedOrder(order: Order) {
    return await this.dataSource.transaction(async (manager) => {
      const fresh = await manager.findOne(Order, {
        where: { id: order.id },
        relations: ['items', 'items.product', 'items.variant'],
      });

      if (!fresh) return;
      if (fresh.status !== OrderStatus.PENDING) return;

      for (const item of fresh.items) {
        const stockSource = item.variant || item.product;
        stockSource.reservedStock -= item.quantity;
        if (stockSource.reservedStock < 0) stockSource.reservedStock = 0;
        await manager.save(stockSource);
      }

      fresh.status = OrderStatus.FAILED;
      fresh.cancelledAt = new Date();
      await manager.save(fresh);
    });
  }

  // ------------------------------------------------------
  // Cancel (فقط ادمین)
  // ------------------------------------------------------
  // توجه: پرداخت فقط توسط خودِ کاربر (درگاه یا کیف پول) انجام می‌شود؛
  // هیچ روت ادمینی نباید سفارش را بدون پرداخت واقعی به PAID تبدیل کند.
  async cancelOrder(orderId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const fresh = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.product', 'items.variant'],
      });

      if (!fresh) throw new NotFoundException('سفارش یافت نشد');
      if (fresh.status !== OrderStatus.PENDING)
        throw new BadRequestException(
          'فقط سفارش‌های در انتظار پرداخت قابل لغو هستند',
        );

      // آزادسازی موجودی رزروشده
      for (const item of fresh.items) {
        const stockSource = item.variant || item.product;
        stockSource.reservedStock -= item.quantity;
        if (stockSource.reservedStock < 0) stockSource.reservedStock = 0;
        await manager.save(stockSource);
      }

      fresh.status = OrderStatus.CANCELED;
      fresh.cancelledAt = new Date();
      await manager.save(fresh);

      return { message: 'سفارش لغو شد', orderId: fresh.id };
    });
  }

  // ------------------------------------------------------
  // Refund System
  // ------------------------------------------------------
  async refundOrder(orderId: number, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, user: { id: userId } },
        relations: ['items', 'items.product', 'items.variant', 'user'],
      });

      if (!order) {
        throw new NotFoundException('سفارش پیدا نشد');
      }

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException('سفارش قابل بازگشت وجه نیست');
      }

      // 1) برگرداندن موجودی (RESTOCK)
      for (const item of order.items) {
        const stockSource = item.variant || item.product;
        stockSource.stock += item.quantity;
        await manager.save(stockSource);
      }

      // 2) پیدا کردن یا ساختن کیف پول
      let wallet = await manager.findOne(Wallet, {
        where: { user: { id: userId } },
      });

      if (!wallet) {
        wallet = manager.create(Wallet, {
          user: { id: userId },
          balance: 0,
        });
        await manager.save(wallet);
      }

      // 3) برگشت مبلغ به کیف پول
      // توجه: final_price از ستون bigint می‌آید و به صورت string است؛
      // اگر مستقیم جمع شود، «عدد + رشته» = الحاق رشته می‌شود و خطای Out of range / 500 می‌دهد.
      // پس حتماً به عدد تبدیل می‌کنیم.
      const refundAmount = Number(order.finalPrice) || 0;
      wallet.balance = (Number(wallet.balance) || 0) + refundAmount;
      await manager.save(wallet);

      // 4) ثبت تراکنش بازگشت
      const tx = manager.create(WalletTransaction, {
        wallet,
        amount: refundAmount,
        status: TransactionStatus.REFUND,
        description: 'Refund for order ' + order.id,
      });

      await manager.save(tx);

      // 5) تغییر وضعیت سفارش
      order.status = OrderStatus.REFUNDED;
      order.refundedAt = new Date();
      await manager.save(order);

      // 6) خروجی
      return {
        message: 'بازگشت وجه با موفقیت انجام شد',
        refundedAmount: refundAmount,
      };
    });
  }

  // ------------------------------------------------------
  // Cashback
  // ------------------------------------------------------
  async addCashback(order: Order, manager) {
    const CASHBACK_PERCENT = 2;

    const amount = Math.floor((order.finalPrice * CASHBACK_PERCENT) / 100);
    if (amount <= 0) return;

    // اگر کاربر هنوز کیف پول نداشته باشد، ساخته می‌شود
    const wallet = await this.walletService.getOrCreateWallet(
      order.user.id,
      manager,
    );

    wallet.balance = (Number(wallet.balance) || 0) + amount;
    await manager.save(wallet);

    const tx = manager.create(WalletTransaction, {
      wallet,
      amount,
      status: TransactionStatus.BONUS,
      description: `Cashback for order ${order.id}`,
    });

    await manager.save(tx);
  }

  //پرداخت با کیف پول
  async payWithWallet(orderId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: { id: orderId },
        relations: ['user'],
      });

      if (!order) {
        throw new NotFoundException('سفارش یافت نشد');
      }

      // فقط صاحب سفارش می‌تواند آن را پرداخت کند
      if (order.user?.id !== userId) {
        throw new BadRequestException('این سفارش متعلق به شما نیست');
      }

      // فقط سفارش‌های PENDING قابل پرداخت هستند
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('این سفارش قابل پرداخت نیست');
      }

      // برداشت مبلغ از کیف پول + ثبت تراکنش
      const { wallet, tx } = await this.chargeWalletWithTx(
        manager,
        userId,
        Number(order.finalPrice) || 0,
        `پرداخت سفارش #${order.id}`,
        TransactionStatus.ORDER_PAYMENT,
      );

      // نهایی‌سازی سفارش (کسر موجودی، آزادسازی رزرو، پاک‌سازی سبد، ثبت زمان پرداخت، پاداش)
      const fresh = await this.finalizePaidOrder(manager, order.id);

      // موجودی نهایی کیف پول (بعد از اعمال cashback)
      const finalWallet = await manager.getRepository(Wallet).findOne({
        where: { id: wallet.id },
      });

      return {
        message: 'پرداخت با موفقیت انجام شد',
        orderId: fresh.id,
        wallet: finalWallet,
        transaction: tx,
      };
    });
  }

  // ------------------------------------------------------
  // Shared: برداشت از کیف پول + ثبت تراکنش (داخل تراکنش دیتابیس)
  // ------------------------------------------------------
  private async chargeWalletWithTx(
    manager: any,
    userId: number,
    amount: number,
    description: string,
    status: TransactionStatus,
  ) {
    if (amount < 0) {
      throw new BadRequestException('مبلغ نامعتبر است');
    }

    // سفارش رایگان (مثلا تخفیف ۱۰۰٪): چیزی از کیف پول کسر نمی‌شود
    if (amount === 0) {
      const wallet = await this.walletService.getOrCreateWallet(
        userId,
        manager,
      );
      return { wallet, tx: null };
    }

    // قفل روی ردیف کیف پول تا دو پرداخت هم‌زمان از یک موجودی برداشت نکنند
    let wallet = await manager
      .getRepository(Wallet)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.userId = :userId', { userId })
      .getOne();

    if (!wallet) {
      wallet = await this.walletService.getOrCreateWallet(userId, manager);
    }

    const balance = Number(wallet.balance) || 0;
    if (balance < amount) {
      throw new BadRequestException('موجودی کیف پول کافی نیست');
    }

    wallet.balance = balance - amount;
    await manager.getRepository(Wallet).save(wallet);

    const tx = manager.getRepository(WalletTransaction).create({
      wallet,
      amount,
      status,
      description,
    });

    await manager.getRepository(WalletTransaction).save(tx);

    return { wallet, tx };
  }
}
