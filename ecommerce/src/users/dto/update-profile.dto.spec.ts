import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      display_name: 'رضا رضایی',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('نام کوتاه‌تر از 2 کاراکتر → خطا', async () => {
    const dto = plainToInstance(UpdateProfileDto, { display_name: 'ر' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'display_name')).toBe(true);
  });

  it('نام بلندتر از 16 کاراکتر → خطا', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      display_name: 'این یک نام بسیار بسیار طولانی است',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'display_name')).toBe(true);
  });
});
