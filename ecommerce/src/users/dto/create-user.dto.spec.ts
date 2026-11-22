import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import UserRoleEnum from '../enums/userRoleEnum';

describe('CreateUserDto', () => {
  const valid = { mobile: '09123456789', display_name: 'علی' };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateUserDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('موبایل نامعتبر → خطا', async () => {
    const dto = plainToInstance(CreateUserDto, { ...valid, mobile: '999' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'mobile')).toBe(true);
  });

  it('role باید user یا admin باشد → مقدار نامعتبر خطا می‌دهد', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...valid,
      role: 'superadmin',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('role معتبر (admin) → بدون خطا', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...valid,
      role: UserRoleEnum.Admin,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
