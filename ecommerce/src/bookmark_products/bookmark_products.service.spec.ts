import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookmarkProductsService } from './bookmark_products.service';

describe('BookmarkProductsService', () => {
  let service: BookmarkProductsService;
  const bookmarkRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };
  const productRepo = { findOneBy: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookmarkProductsService(
      bookmarkRepo as any,
      productRepo as any,
    );
  });

  describe('bookmarkProduct', () => {
    it('محصول ناموجود → NotFoundException', async () => {
      productRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.bookmarkProduct(1, { productId: 5 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('قبلاً نشان شده → BadRequestException', async () => {
      productRepo.findOneBy.mockResolvedValue({ id: 5 });
      bookmarkRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(
        service.bookmarkProduct(1, { productId: 5 } as any),
      ).rejects.toThrow('already bookmarked');
    });

    it('موفق → نشان جدید ساخته می‌شود', async () => {
      productRepo.findOneBy.mockResolvedValue({ id: 5 });
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.create.mockReturnValue({ id: 9 });
      bookmarkRepo.save.mockResolvedValue({ id: 9 });

      const result = await service.bookmarkProduct(1, { productId: 5 } as any);

      expect(bookmarkRepo.create).toHaveBeenCalledWith({
        user: { id: 1 },
        product: { id: 5 },
      });
      expect(result.id).toBe(9);
    });
  });

  describe('unbookmarkProduct', () => {
    it('نشان وجود نداشته باشد → NotFoundException', async () => {
      bookmarkRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.unbookmarkProduct(1, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('حذف موفق', async () => {
      bookmarkRepo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.unbookmarkProduct(1, 5)).resolves.toBeUndefined();
    });
  });

  describe('toggleBookmark', () => {
    it('وجود داشته باشد → حذف و bookmarked=false', async () => {
      bookmarkRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.toggleBookmark(1, 5);

      expect(bookmarkRepo.delete).toHaveBeenCalled();
      expect(result).toEqual({ bookmarked: false });
    });

    it('نداشته باشد → ساخته و bookmarked=true', async () => {
      bookmarkRepo.findOne.mockResolvedValue(null);
      bookmarkRepo.create.mockReturnValue({});
      bookmarkRepo.save.mockResolvedValue({});

      const result = await service.toggleBookmark(1, 5);

      expect(result).toEqual({ bookmarked: true });
    });
  });
});
