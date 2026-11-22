import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const categoryRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(categoryRepo as any);
  });

  describe('create', () => {
    it('والد ناموجود → NotFoundException', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ title: 'x', parentId: 99 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('موفق → دسته ساخته و ذخیره می‌شود', async () => {
      categoryRepo.create.mockReturnValue({ id: 1 });
      categoryRepo.save.mockResolvedValue({ id: 1 });

      const result = await service.create({ title: 'پوشاک' } as any);

      expect(categoryRepo.save).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });
  });

  describe('update (جلوگیری از حلقه)', () => {
    it('دسته نمی‌تواند والد خودش شود', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 1, title: 'x' });

      await expect(service.update(1, { parentId: 1 } as any)).rejects.toThrow(
        'والد خودش',
      );
    });

    it('زیردسته نمی‌تواند والد شود (حلقه)', async () => {
      categoryRepo.findOne
        .mockResolvedValueOnce({ id: 1, title: 'پدر' }) // findOne دسته
        .mockResolvedValueOnce({ id: 2 }); // findOne والد جدید (وجود دارد)
      categoryRepo.find.mockResolvedValue([{ id: 2 }]); // فرزندان دسته ۱ شامل ۲ است

      await expect(service.update(1, { parentId: 2 } as any)).rejects.toThrow(
        'زیردسته‌های این دسته‌بندی',
      );
    });

    it('ویرایش موفق', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 1, title: 'پوشاک' });
      categoryRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.update(1, { title: 'پوشاک جدید' } as any);

      expect(result.title).toBe('پوشاک جدید');
    });
  });

  describe('findOne / removeOnlyCategory', () => {
    it('دسته ناموجود → NotFoundException', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('حذف موفق → رابطه محصولات هم پاک می‌شود', async () => {
      const category = { id: 1, products: [{ id: 5 }] };
      categoryRepo.findOne.mockResolvedValue(category);
      categoryRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.removeOnlyCategory(1);

      expect(category.products).toEqual([]);
      expect(categoryRepo.remove).toHaveBeenCalledWith(category);
      expect(result).toContain('removed');
    });
  });
});
