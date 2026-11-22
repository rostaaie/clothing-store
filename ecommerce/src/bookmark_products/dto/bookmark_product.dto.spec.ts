import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BookmarkProductDto } from './bookmark_product.dto';

describe('BookmarkProductDto', () => {
  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(BookmarkProductDto, { productId: 1 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('productId الزامی است → حذف آن خطا می‌دهد', async () => {
    const dto = plainToInstance(BookmarkProductDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'productId')).toBe(true);
  });

  it('productId غیرعددی → خطا', async () => {
    const dto = plainToInstance(BookmarkProductDto, { productId: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'productId')).toBe(true);
  });
});
