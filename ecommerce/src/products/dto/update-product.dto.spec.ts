import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProductDto } from './update-product.dto';

describe('UpdateProductDto', () => {
  it('بدون فیلد → معتبر (همه اختیاری)', async () => {
    const dto = plainToInstance(UpdateProductDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('فقط یک فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateProductDto, { price: 1000 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('قیمت منفی → خطا', async () => {
    const dto = plainToInstance(UpdateProductDto, { price: -10 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'price')).toBe(true);
  });
});
