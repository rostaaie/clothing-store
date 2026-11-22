import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BasketDto } from './basket.dto';

describe('BasketDto', () => {
  const valid = { productId: 1, quantity: 2 };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(BasketDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('productId الزامی است → حذف آن خطا می‌دهد', async () => {
    const dto = plainToInstance(BasketDto, { quantity: 2 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'productId')).toBe(true);
  });

  it('quantity کمتر از 1 → خطا', async () => {
    const dto = plainToInstance(BasketDto, { ...valid, quantity: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantity')).toBe(true);
  });

  it('variantId اختیاری است', async () => {
    const dto = plainToInstance(BasketDto, { ...valid, variantId: 5 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
