import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WithdrawDto } from './withdraw.dto';

describe('WithdrawDto', () => {
  it('مبلغ معتبر → بدون خطا', async () => {
    const dto = plainToInstance(WithdrawDto, { amount: 200000 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('مبلغ کمتر از 1000 → خطا', async () => {
    const dto = plainToInstance(WithdrawDto, { amount: 999 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('مبلغ منفی → خطا', async () => {
    const dto = plainToInstance(WithdrawDto, { amount: -100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });
});
