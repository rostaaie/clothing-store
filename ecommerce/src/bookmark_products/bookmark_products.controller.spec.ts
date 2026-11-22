import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { BookmarkProductsController } from './bookmark_products.controller';
import { BookmarkProductsService } from './bookmark_products.service';

describe('BookmarkProductsController', () => {
  let controller: BookmarkProductsController;
  const bookmarkProductsService = {
    getUserBookmarks: jest.fn(),
    bookmarkProduct: jest.fn(),
    unbookmarkProduct: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkProductsController],
      providers: [
        { provide: BookmarkProductsService, useValue: bookmarkProductsService },
      ],
    }).compile();

    controller = module.get<BookmarkProductsController>(
      BookmarkProductsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyBookmarks → نشانه‌گذاری‌های کاربر را برمی‌گرداند', async () => {
    bookmarkProductsService.getUserBookmarks.mockResolvedValue([{ id: 1 }]);

    const result = await controller.getMyBookmarks(7);

    expect(bookmarkProductsService.getUserBookmarks).toHaveBeenCalledWith(7);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });

  it('bookmarking → نشانه‌گذاری با statusCode 201', async () => {
    bookmarkProductsService.bookmarkProduct.mockResolvedValue({ id: 5 });

    const result = await controller.bookmarking(7, { productId: 5 } as any);

    expect(bookmarkProductsService.bookmarkProduct).toHaveBeenCalledWith(7, {
      productId: 5,
    });
    expect(result.statusCode).toBe(HttpStatus.CREATED);
  });

  it('removeBookmark → نشانه‌گذاری حذف می‌شود', async () => {
    bookmarkProductsService.unbookmarkProduct.mockResolvedValue(undefined);

    const result = await controller.removeBookmark(7, 5);

    expect(bookmarkProductsService.unbookmarkProduct).toHaveBeenCalledWith(
      7,
      5,
    );
    expect(result.statusCode).toBe(HttpStatus.OK);
  });
});
