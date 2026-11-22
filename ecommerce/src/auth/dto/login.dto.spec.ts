import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  const valid = { mobile: '09123456789', password: 'secret123' };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(LoginDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('موبایل نامعتبر → خطا', async () => {
    const dto = plainToInstance(LoginDto, { ...valid, mobile: '123' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'mobile')).toBe(true);
  });

  it('رمز عبور کوتاه → خطا', async () => {
    const dto = plainToInstance(LoginDto, { ...valid, password: 'a' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
