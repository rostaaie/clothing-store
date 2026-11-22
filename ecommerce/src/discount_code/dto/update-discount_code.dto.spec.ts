import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateDiscountCodeDto } from './update-discount_code.dto';

describe('UpdateDiscountCodeDto', () => {
  it('بدون فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateDiscountCodeDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('فقط یک فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateDiscountCodeDto, { percent: 10 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('percent نامعتبر → خطا', async () => {
    const dto = plainToInstance(UpdateDiscountCodeDto, { percent: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'percent')).toBe(true);
  });
});
