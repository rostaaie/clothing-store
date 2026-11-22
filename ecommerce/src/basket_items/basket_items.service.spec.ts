import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BasketItemsService } from './basket_items.service';

describe('BasketItemsService', () => {
  let service: BasketItemsService;
  const basketRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
  const productRepo = { findOne: jest.fn() };
  const variantRepo = {};

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BasketItemsService(
      basketRepo as any,
      productRepo as any,
      variantRepo as any,
    );
  });

  describe('addToBasket', () => {
    it('محصول ناموجود → NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addToBasket(1, { productId: 1, quantity: 1 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('محصول سایز/رنگ‌دار بدون انتخاب variant → BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, variants: [{ id: 10 }] });

      await expect(
        service.addToBasket(1, { productId: 1, quantity: 1 } as any),
      ).rejects.toThrow('سایز/رنگ');
    });

    it('variant نامعتبر → BadRequestException', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, variants: [{ id: 10 }] });

      await expect(
        service.addToBasket(1, {
          productId: 1,
          quantity: 1,
          variantId: 99,
        } as any),
      ).rejects.toThrow('معتبر نیست');
    });

    it('آیتم تکراری → تعداد افزایش می‌یابد', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, variants: [] });
      basketRepo.findOne.mockResolvedValue({ id: 5, quantity: 2 });
      basketRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.addToBasket(1, {
        productId: 1,
        quantity: 3,
      } as any);

      expect(result.quantity).toBe(5);
    });

    it('آیتم جدید → ساخته و ذخیره می‌شود', async () => {
      productRepo.findOne.mockResolvedValue({ id: 1, variants: [] });
      basketRepo.findOne.mockResolvedValue(null);
      basketRepo.create.mockReturnValue({ id: 7, quantity: 1 });
      basketRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.addToBasket(1, {
        productId: 1,
        quantity: 1,
      } as any);

      expect(basketRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1 },
          product: { id: 1 },
          quantity: 1,
        }),
      );
      expect(result.id).toBe(7);
    });
  });

  describe('removeItem', () => {
    it('آیتم ناموجود → NotFoundException', async () => {
      basketRepo.findOne.mockResolvedValue(null);

      await expect(service.removeItem(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('حذف موفق', async () => {
      basketRepo.findOne.mockResolvedValue({ id: 5 });

      const result = await service.removeItem(1, 1);

      expect(basketRepo.remove).toHaveBeenCalledWith({ id: 5 });
      expect(result.removed).toBe(true);
    });
  });
});
