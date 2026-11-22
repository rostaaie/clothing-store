import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAddressDto } from './update-address.dto';

describe('UpdateAddressDto', () => {
  it('بدون فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateAddressDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('فقط یک فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateAddressDto, { city: 'کرج' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('کد پستی با طول اشتباه → خطا', async () => {
    const dto = plainToInstance(UpdateAddressDto, { postal_code: '12' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'postal_code')).toBe(true);
  });
});
