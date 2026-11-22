import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateOrderDto } from './update-order.dto';

describe('UpdateOrderDto', () => {
  it('بدون فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateOrderDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('addressId غیرعددی → خطا', async () => {
    const dto = plainToInstance(UpdateOrderDto, { addressId: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'addressId')).toBe(true);
  });
});
