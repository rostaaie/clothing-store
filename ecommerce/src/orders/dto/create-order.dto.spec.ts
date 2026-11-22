import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto } from './create-order.dto';

describe('CreateOrderDto', () => {
  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateOrderDto, { addressId: 1 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('addressId الزامی است → حذف آن خطا می‌دهد', async () => {
    const dto = plainToInstance(CreateOrderDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'addressId')).toBe(true);
  });

  it('discountCodeId اختیاری است', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      addressId: 1,
      discountCodeId: 3,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('discountCodeId غیرعددی → خطا', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      addressId: 1,
      discountCodeId: 'x',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'discountCodeId')).toBe(true);
  });
});
