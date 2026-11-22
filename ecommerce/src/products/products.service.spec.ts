import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

/**
 * مثال تست واحد (Unit Test) واقعی برای ProductsService
 *
 * نکته‌ها:
 * - به جای دیتابیس واقعی، ریپازیتوری‌ها را mock می‌کنیم (jest.fn)
 * - هر تست فقط یک رفتار را چک می‌کند
 * - این تست‌ها دقیقاً همان باگی را می‌گرفتند که قبلاً حذف محصول -> 500 می‌داد
 */
describe('ProductsService', () => {
  let service: ProductsService;

  // ---- mock ریپازیتوری‌ها (به ترتیب constructor سرویس) ----
  const productRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const variantRepo = { create: jest.fn(), delete: jest.fn() };
  const categoryRepo = { findBy: jest.fn() };
  const productViewRepo = {};
  const orderItemRepo = { count: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(
      productRepo as any,
      variantRepo as any,
      categoryRepo as any,
      productViewRepo as any,
      orderItemRepo as any,
    );
  });

  describe('create', () => {
    const dto = {
      title: 'تیشرت تست',
      description: 'توضیح',
      price: 100000,
      stock: 5,
      categoryIds: [1],
    };

    it('محصول را با دسته‌بندی معتبر می‌سازد و ذخیره می‌کند', async () => {
      categoryRepo.findBy.mockResolvedValue([{ id: 1 }]); // دسته ۱ وجود دارد
      productRepo.create.mockReturnValue({ id: undefined, title: dto.title });
      productRepo.save.mockResolvedValue({ id: 10, title: dto.title });
      productRepo.findOne.mockResolvedValue({
        id: 10,
        title: dto.title,
        variants: [],
      });

      const result = await service.create(dto);

      expect(categoryRepo.findBy).toHaveBeenCalled();
      expect(productRepo.save).toHaveBeenCalled();
      // findOne در سرویس با آبجکت آپشن (relations) صدا زده می‌شود
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: { categories: true, variants: true },
      });
      expect(result.id).toBe(10);
    });

    it('اگر دسته‌بندی وجود نداشته باشد خطای BadRequest می‌دهد', async () => {
      categoryRepo.findBy.mockResolvedValue([{ id: 2 }]); // دسته ۱ پیدا نشد!

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(productRepo.save).not.toHaveBeenCalled(); // چیزی ذخیره نشود
    });
  });

  describe('remove', () => {
    it('محصول بدون سفارش را حذف می‌کند', async () => {
      productRepo.findOne.mockResolvedValue({
        id: 5,
        title: 'x',
        variants: [],
      });
      orderItemRepo.count.mockResolvedValue(0); // هیچ سفارشی به آن ارجاع ندارد

      await service.remove(5);

      expect(productRepo.remove).toHaveBeenCalledWith({
        id: 5,
        title: 'x',
        variants: [],
      });
    });

    it('محصولی که در سفارش استفاده شده را با پیام واضح بلاک می‌کند (نه 500!)', async () => {
      productRepo.findOne.mockResolvedValue({
        id: 5,
        title: 'x',
        variants: [],
      });
      orderItemRepo.count.mockResolvedValue(3); // در ۳ سفارش استفاده شده

      await expect(service.remove(5)).rejects.toThrow(
        'این محصول در سفارش‌های قبلی استفاده شده و قابل حذف نیست',
      );
      expect(productRepo.remove).not.toHaveBeenCalled(); // حذف نشود
    });

    it('اگر محصول وجود نداشته باشد NotFound می‌دهد', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
