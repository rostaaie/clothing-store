import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RefreshDto } from './refresh.dto';

describe('RefreshDto', () => {
  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 'some.jwt.token' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('refreshToken خالی → خطا', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'refreshToken')).toBe(true);
  });

  it('refreshToken غیرمتن → خطا', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 123 } as any);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'refreshToken')).toBe(true);
  });
});
