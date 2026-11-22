import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAddressDto } from './create-address.dto';

describe('CreateAddressDto', () => {
  const valid = {
    province: 'تهران',
    city: 'تهران',
    adress: 'خیابان ولیعصر، پلاک 12',
    postal_code: '1234567890',
    reciver_mobile: '09123456789',
  };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateAddressDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('استان خالی → خطا', async () => {
    const dto = plainToInstance(CreateAddressDto, { ...valid, province: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'province')).toBe(true);
  });

  it('کد پستی با طول اشتباه → خطا', async () => {
    const dto = plainToInstance(CreateAddressDto, {
      ...valid,
      postal_code: '12345',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'postal_code')).toBe(true);
  });

  it('موبایل گیرنده با طول اشتباه → خطا', async () => {
    const dto = plainToInstance(CreateAddressDto, {
      ...valid,
      reciver_mobile: '0912',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'reciver_mobile')).toBe(true);
  });

  it('description اختیاری است', async () => {
    const dto = plainToInstance(CreateAddressDto, {
      ...valid,
      description: 'بعد از ساعت 5',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
