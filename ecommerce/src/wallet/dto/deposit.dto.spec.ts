import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DepositDto } from './deposit.dto';

describe('DepositDto', () => {
  it('مبلغ معتبر → بدون خطا', async () => {
    const dto = plainToInstance(DepositDto, { amount: 500000 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('مبلغ کمتر از 1000 → خطا', async () => {
    const dto = plainToInstance(DepositDto, { amount: 500 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('مبلغ غیرعددی → خطا', async () => {
    const dto = plainToInstance(DepositDto, { amount: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });
});
