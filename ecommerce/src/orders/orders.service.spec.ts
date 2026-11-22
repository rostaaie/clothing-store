import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from './enums/order-status';

describe('OrdersService', () => {
  let service: OrdersService;

  // --- mock ها ---
  const manager: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    getRepository: jest.fn(),
  };
  const dataSource = { transaction: jest.fn(async (cb: any) => cb(manager)) };
  const paymentProvider = {
    requestPayment: jest.fn(),
    verifyPayment: jest.fn(),
  };
  const walletService = { getOrCreateWallet: jest.fn() };
  const orderRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
  };
  const basketRepo = { find: jest.fn(), delete: jest.fn() };
  const productRepo = {};
  const orderItemRepo = {};
  const discountRepo = { findOne: jest.fn() };
  const walletRepo = {};

  const pendingOrder = {
    id: 1,
    user: { id: 1 },
    status: OrderStatus.PENDING,
    finalPrice: 100000,
    items: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(
      basketRepo as any,
      productRepo as any,
      orderRepo as any,
      orderItemRepo as any,
      discountRepo as any,
      walletRepo as any,
      dataSource as any,
      paymentProvider as any,
      walletService as any,
    );
  });

  // ═══════════════ requestPayment ═══════════════
  describe('requestPayment', () => {
    it('سفارش یافت نشود → NotFoundException', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.requestPayment(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('سفارش PENDING نباشد → BadRequestException', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });
      await expect(service.requestPayment(1, 1)).rejects.toThrow(
        'قابل پرداخت نیست',
      );
    });

    it('موفق → Authority صادرشده ذخیره و در پاسخ برمی‌گردد', async () => {
      orderRepo.findOne.mockResolvedValue(pendingOrder);
      paymentProvider.requestPayment.mockResolvedValue({
        url: 'https://gw/pay',
        authority: 'AUTH_1',
      });

      const result = await service.requestPayment(1, 1);

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentAuthority: 'AUTH_1',
          paymentRequestedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual({
        paymentUrl: 'https://gw/pay',
        authority: 'AUTH_1',
      });
    });
  });

  // ═══════════════ verifyPayment (امنیت پرداخت) ═══════════════
  describe('verifyPayment', () => {
    beforeEach(() => {
      orderRepo.findOne.mockResolvedValue({
        ...pendingOrder,
        paymentRequestedAt: new Date(),
        paymentAuthority: 'AUTH_1',
      });
      paymentProvider.verifyPayment.mockResolvedValue({ success: true });
    });

    it('سفارش متعلق به کاربر نباشد → رد می‌شود (جلوگیری از IDOR)', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...pendingOrder,
        user: { id: 2 },
        paymentRequestedAt: new Date(),
        paymentAuthority: 'AUTH_1',
      });

      await expect(
        service.verifyPayment(1, { Authority: 'AUTH_1' }, 1),
      ).rejects.toThrow('این سفارش متعلق به شما نیست');
      expect(paymentProvider.verifyPayment).not.toHaveBeenCalled();
    });

    it('بدون درخواست پرداخت قبلی → رد می‌شود', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...pendingOrder,
        paymentRequestedAt: null,
        paymentAuthority: null,
      });

      await expect(
        service.verifyPayment(1, { Authority: 'AUTH_1' }, 1),
      ).rejects.toThrow('درخواست پرداختی ثبت نشده');
    });

    it('Authority نادرست → رد می‌شود', async () => {
      await expect(
        service.verifyPayment(1, { Authority: 'WRONG' }, 1),
      ).rejects.toThrow('نامعتبر است');
    });

    it('Authority درست → پرداخت نهایی و PAID می‌شود', async () => {
      const fresh = {
        id: 1,
        status: OrderStatus.PENDING,
        items: [],
        user: { id: 1 },
        finalPrice: 100000,
      };
      manager.findOne.mockResolvedValue(fresh);
      manager.save.mockImplementation(async (x: any) => x);
      manager.create.mockReturnValue({});
      manager.delete.mockResolvedValue({});
      walletService.getOrCreateWallet.mockResolvedValue({ id: 1, balance: 0 });
      dataSource.transaction.mockImplementation(async (cb: any) => cb(manager));

      const result = await service.verifyPayment(1, { Authority: 'AUTH_1' }, 1);

      expect(paymentProvider.verifyPayment).toHaveBeenCalledWith({
        Authority: 'AUTH_1',
      });
      expect(result.message).toBe('پرداخت موفق');
    });
  });

  // ═══════════════ payWithWallet ═══════════════
  describe('payWithWallet', () => {
    it('سفارش متعلق به کاربر نباشد → رد می‌شود', async () => {
      manager.getRepository.mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue({ ...pendingOrder, user: { id: 2 } }),
      });

      await expect(service.payWithWallet(1, 1)).rejects.toThrow(
        'این سفارش متعلق به شما نیست',
      );
    });

    it('سفارش PENDING نباشد → رد می‌شود', async () => {
      manager.getRepository.mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue({ ...pendingOrder, status: OrderStatus.PAID }),
      });

      await expect(service.payWithWallet(1, 1)).rejects.toThrow(
        'قابل پرداخت نیست',
      );
    });
  });

  // ═══════════════ cancelOrder ═══════════════
  describe('cancelOrder', () => {
    it('فقط سفارش PENDING قابل لغو است', async () => {
      manager.findOne.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });

      await expect(service.cancelOrder(1)).rejects.toThrow(
        'فقط سفارش‌های در انتظار پرداخت',
      );
    });

    it('لغو موفق → وضعیت CANCELED می‌شود', async () => {
      manager.findOne.mockResolvedValue({ ...pendingOrder, items: [] });
      manager.save.mockImplementation(async (x: any) => x);

      const result = await service.cancelOrder(1);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELED }),
      );
      expect(result.orderId).toBe(1);
    });
  });

  // ═══════════════ refundOrder ═══════════════
  describe('refundOrder', () => {
    it('فقط سفارش PAID قابل استرداد است', async () => {
      manager.findOne.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PENDING,
      });

      await expect(service.refundOrder(1, 1)).rejects.toThrow(
        'سفارش قابل بازگشت وجه نیست',
      );
    });

    it('استرداد موفق → مبلغ به کیف پول برمی‌گردد و وضعیت REFUNDED می‌شود', async () => {
      manager.findOne.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
        items: [],
      });
      manager.findOne.mockResolvedValueOnce({
        ...pendingOrder,
        status: OrderStatus.PAID,
        items: [],
      }); // order
      manager.findOne.mockResolvedValueOnce(null); // wallet پیدا نشد → ساخته می‌شود
      manager.create.mockReturnValue({});
      manager.save.mockImplementation(async (x: any) => x);

      const result = await service.refundOrder(1, 1);

      expect(manager.create).toHaveBeenCalled(); // ساخت کیف پول جدید
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.REFUNDED }),
      );
      expect(result.refundedAmount).toBe(100000);
    });
  });

  // ═══════════════ createOrder ═══════════════
  describe('createOrder', () => {
    const address = { id: 1, user: { id: 1 } };
    const basketItem = {
      product: {
        id: 5,
        title: 'تیشرت',
        price: 100000,
        stock: 10,
        reservedStock: 0,
      },
      variant: null,
      quantity: 1,
    };

    it('آدرس نامعتبر → BadRequestException', async () => {
      manager.findOne.mockResolvedValue(null); // آدرس پیدا نشد

      await expect(service.createOrder(1, 1)).rejects.toThrow('آدرس');
    });

    it('سبد خالی → BadRequestException', async () => {
      manager.findOne.mockResolvedValue(address);
      manager.find.mockResolvedValue([]);

      await expect(service.createOrder(1, 1)).rejects.toThrow(
        'سبد خرید خالی است',
      );
    });

    it('کد تخفیف نامعتبر → BadRequestException', async () => {
      manager.findOne.mockResolvedValueOnce(address);
      manager.find.mockResolvedValue([basketItem]);
      manager.findOne.mockResolvedValueOnce(null); // کد تخفیف پیدا نشد

      await expect(service.createOrder(1, 1, 'INVALID')).rejects.toThrow(
        'کد تخفیف نامعتبر',
      );
    });

    it('ساخت موفق (GATEWAY) → سفارش PENDING با مبلغ صحیح', async () => {
      manager.findOne.mockResolvedValueOnce(address);
      manager.find.mockResolvedValue([basketItem]);
      // create باید دیتای ورودی را نگه دارد تا save همان آبجکت را ببیند
      manager.create.mockImplementation((_entity: any, data: any) => ({
        id: 10,
        ...data,
      }));
      manager.save.mockImplementation(async (x: any) => x);

      const result = await service.createOrder(1, 1);

      expect(result.orderId).toBe(10);
      expect(result.finalPrice).toBe(100000);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.PENDING,
          totalPrice: 100000,
        }),
      );
    });
  });
});
