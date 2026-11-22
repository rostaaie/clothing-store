import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangePasswordDto } from './change-password.dto';

describe('ChangePasswordDto', () => {
  const valid = { currentPassword: 'oldSecret', newPassword: 'newSecret123' };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(ChangePasswordDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('رمز فعلی خالی → خطا', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      ...valid,
      currentPassword: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
  });

  it('رمز جدید کوتاه‌تر از 3 کاراکتر → خطا', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      ...valid,
      newPassword: 'ab',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });
});
