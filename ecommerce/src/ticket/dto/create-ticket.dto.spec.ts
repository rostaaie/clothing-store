import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTicketDto } from './create-ticket.dto';

describe('CreateTicketDto', () => {
  const valid = {
    title: 'مشکل در پرداخت',
    subject: 'پشتیبانی فنی',
    description: 'توضیحات کامل مشکل کاربر',
  };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateTicketDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('عنوان کوتاه‌تر از 5 کاراکتر → خطا', async () => {
    const dto = plainToInstance(CreateTicketDto, { ...valid, title: 'مشکل' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('توضیحات کوتاه‌تر از 10 کاراکتر → خطا', async () => {
    const dto = plainToInstance(CreateTicketDto, {
      ...valid,
      description: 'کوتاه',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });

  it('replyToId باید UUID معتبر باشد', async () => {
    const dto = plainToInstance(CreateTicketDto, {
      ...valid,
      replyToId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'replyToId')).toBe(true);
  });

  it('replyToId UUID معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateTicketDto, {
      ...valid,
      replyToId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
