import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscountCodeService } from './discount_code.service';

describe('DiscountCodeService', () => {
  let service: DiscountCodeService;
  const discountRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DiscountCodeService(discountRepo as any);
  });

  describe('create', () => {
    it('کد تکراری → BadRequestException', async () => {
      discountRepo.findOne.mockResolvedValue({ id: 1, code: 'SAVE10' });

      await expect(
        service.create({ code: 'SAVE10', maxUsage: 10 } as any),
      ).rejects.toThrow('تکراری');
    });

    it('موفق → کد ساخته می‌شود', async () => {
      discountRepo.findOne.mockResolvedValue(null);
      discountRepo.create.mockReturnValue({ id: 1 });
      discountRepo.save.mockResolvedValue({ id: 1 });

      const result = await service.create({
        code: 'NEW10',
        maxUsage: 10,
      } as any);

      expect(result.id).toBe(1);
    });
  });

  describe('validateDiscount', () => {
    it('کد وجود نداشته باشد → null', async () => {
      discountRepo.findOne.mockResolvedValue(null);
      expect(await service.validateDiscount('X')).toBeNull();
    });

    it('به سقف استفاده رسیده → null', async () => {
      discountRepo.findOne.mockResolvedValue({
        code: 'X',
        maxUsage: 5,
        usageCount: 5,
        expireAt: null,
      });
      expect(await service.validateDiscount('X')).toBeNull();
    });

    it('منقضی شده → null', async () => {
      discountRepo.findOne.mockResolvedValue({
        code: 'X',
        maxUsage: 5,
        usageCount: 0,
        expireAt: new Date(Date.now() - 1000),
      });
      expect(await service.validateDiscount('X')).toBeNull();
    });

    it('معتبر → خود کد برمی‌گردد', async () => {
      const discount = {
        code: 'X',
        maxUsage: 5,
        usageCount: 1,
        expireAt: null,
      };
      discountRepo.findOne.mockResolvedValue(discount);
      expect(await service.validateDiscount('X')).toBe(discount);
    });
  });

  describe('findOne / remove', () => {
    it('کد ناموجود → NotFoundException', async () => {
      discountRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('حذف موفق', async () => {
      discountRepo.findOne.mockResolvedValue({ id: 1 });
      await service.remove(1);
      expect(discountRepo.remove).toHaveBeenCalledWith({ id: 1 });
    });
  });
});
