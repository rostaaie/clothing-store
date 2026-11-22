import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  const valid = {
    title: 'گوشی سامسونگ',
    description: 'توضیحات کامل محصول',
    price: 12500000,
  };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateProductDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('عنوان کوتاه‌تر از 3 کاراکتر → خطا', async () => {
    const dto = plainToInstance(CreateProductDto, { ...valid, title: 'گو' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('قیمت منفی → خطا', async () => {
    const dto = plainToInstance(CreateProductDto, { ...valid, price: -100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'price')).toBe(true);
  });

  it('stock منفی → خطا', async () => {
    const dto = plainToInstance(CreateProductDto, { ...valid, stock: -5 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stock')).toBe(true);
  });

  it('categoryIds با مقدار غیرعددی → خطا', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...valid,
      categoryIds: ['a'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categoryIds')).toBe(true);
  });
});
