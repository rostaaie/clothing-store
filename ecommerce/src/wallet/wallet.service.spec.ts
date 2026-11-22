import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TransactionStatus } from './enums/transaction-status';

describe('WalletService', () => {
  let service: WalletService;
  const walletRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const txRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn() };
  const userRepo = { findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WalletService(
      walletRepo as any,
      txRepo as any,
      userRepo as any,
    );
  });

  describe('getUserWallet', () => {
    it('کاربر ناموجود → NotFoundException (نه 500)', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserWallet(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('اگر کیف پول نباشد با موجودی صفر ساخته می‌شود', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1 });
      walletRepo.findOne
        .mockResolvedValueOnce(null) // getUserWallet: پیدا نکرد
        .mockResolvedValueOnce(null); // getOrCreateWallet: پیدا نکرد
      walletRepo.create.mockReturnValue({
        id: 10,
        balance: 0,
        user: { id: 1 },
      });
      walletRepo.save.mockResolvedValue({ id: 10, balance: 0 });

      const result = await service.getUserWallet(1);

      expect(result.balance).toBe(0);
      expect(result.transactions).toEqual([]);
    });
  });

  describe('deposit', () => {
    it('مبلغ نامعتبر → BadRequestException', async () => {
      await expect(service.deposit(1, 0, 'شارژ')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deposit(1, -100, 'شارژ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('شارژ موفق → موجودی زیاد می‌شود و تراکنش ثبت می‌شود', async () => {
      walletRepo.findOne.mockResolvedValue(null); // getOrCreateWallet: می‌سازد
      walletRepo.create.mockReturnValue({ id: 1, balance: 0, user: { id: 1 } });
      walletRepo.save.mockResolvedValue({ id: 1, balance: 0 });
      txRepo.create.mockReturnValue({ id: 5 });

      const result = await service.deposit(1, 100000, 'شارژ کیف پول');

      expect(result.balance).toBe(100000);
      expect(walletRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 100000 }),
      );
      expect(txRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100000,
          status: TransactionStatus.DEPOSIT,
        }),
      );
      expect(txRepo.save).toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    it('موجودی کافی نباشد → BadRequestException', async () => {
      walletRepo.findOne.mockResolvedValue({ id: 1, balance: 50000 });

      await expect(service.withdraw(1, 100000, 'برداشت')).rejects.toThrow(
        'موجودی کیف پول کافی نیست',
      );
      expect(walletRepo.save).not.toHaveBeenCalled();
    });

    it('برداشت موفق → موجودی کم می‌شود', async () => {
      walletRepo.findOne.mockResolvedValue({ id: 1, balance: 200000 });
      walletRepo.save.mockResolvedValue({ id: 1, balance: 200000 });
      txRepo.create.mockReturnValue({ id: 6 });

      const result = await service.withdraw(1, 50000, 'برداشت');

      expect(result.balance).toBe(150000);
    });
  });

  describe('getUserTransactions', () => {
    it('کیف پول وجود نداشته باشد → NotFoundException', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserTransactions(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('تراکنش‌ها را به ترتیب نزولی برمی‌گرداند', async () => {
      walletRepo.findOne.mockResolvedValue({ id: 1 });
      txRepo.find.mockResolvedValue([{ id: 2 }, { id: 1 }]);

      const result = await service.getUserTransactions(1);

      expect(txRepo.find).toHaveBeenCalledWith({
        where: { wallet: { id: 1 } },
        order: { id: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
