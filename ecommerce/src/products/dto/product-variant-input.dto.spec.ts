import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ProductVariantInputDto } from './product-variant-input.dto';

describe('ProductVariantInputDto', () => {
  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(ProductVariantInputDto, {
      size: 'M',
      color: 'مشکی',
      stock: 10,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('سایز و رنگ اختیاری هستند (فقط stock لازم است)', async () => {
    const dto = plainToInstance(ProductVariantInputDto, { stock: 5 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('stock منفی → خطا', async () => {
    const dto = plainToInstance(ProductVariantInputDto, { stock: -1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stock')).toBe(true);
  });

  it('stock غیرعددی → خطا', async () => {
    const dto = plainToInstance(ProductVariantInputDto, { stock: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stock')).toBe(true);
  });
});
