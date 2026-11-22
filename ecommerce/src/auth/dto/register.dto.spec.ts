import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const valid = {
    mobile: '09123456789',
    display_name: 'علی',
    password: 'secret123',
  };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(RegisterDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('موبایل نامعتبر → خطا', async () => {
    const dto = plainToInstance(RegisterDto, { ...valid, mobile: '12345' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'mobile')).toBe(true);
  });

  it('نام کوتاه‌تر از 2 کاراکتر → خطا', async () => {
    const dto = plainToInstance(RegisterDto, { ...valid, display_name: 'ع' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'display_name')).toBe(true);
  });

  it('رمز عبور کوتاه‌تر از 3 کاراکتر → خطا', async () => {
    const dto = plainToInstance(RegisterDto, { ...valid, password: 'ab' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
