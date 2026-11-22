import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';
import UserRoleEnum from '../enums/userRoleEnum';

describe('UpdateUserDto', () => {
  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      display_name: 'رضا رضایی',
      role: UserRoleEnum.Admin,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('display_name الزامی است → حذف آن خطا می‌دهد', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'display_name')).toBe(true);
  });

  it('display_name خالی → خطا', async () => {
    const dto = plainToInstance(UpdateUserDto, { display_name: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'display_name')).toBe(true);
  });

  it('role نامعتبر → خطا', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      display_name: 'علی',
      role: 'root',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });
});
