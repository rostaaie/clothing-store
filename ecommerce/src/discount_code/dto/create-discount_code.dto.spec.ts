import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDiscountCodeDto } from './create-discount_code.dto';

describe('CreateDiscountCodeDto', () => {
  const valid = { code: 'SUMMER2024', maxUsage: 100 };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('کد کوتاه‌تر از 3 کاراکتر → خطا', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      ...valid,
      code: 'AB',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('درصد کمتر از 1 → خطا', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      ...valid,
      percent: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'percent')).toBe(true);
  });

  it('مبلغ کمتر از 1000 → خطا', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      ...valid,
      amount: 999,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('maxUsage منفی → خطا', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      ...valid,
      maxUsage: -1,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'maxUsage')).toBe(true);
  });

  it('expireAt با تاریخ ساده (2024-12-31) → به ISO تبدیل و معتبر است', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      ...valid,
      expireAt: '2024-12-31',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('expireAt نامعتبر → خطا', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      ...valid,
      expireAt: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'expireAt')).toBe(true);
  });
});
