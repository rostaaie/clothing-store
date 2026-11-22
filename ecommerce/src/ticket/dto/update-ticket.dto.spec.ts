import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateTicketDto } from './update-ticket.dto';

describe('UpdateTicketDto', () => {
  it('بدون فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateTicketDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('subject معتبر → بدون خطا', async () => {
    const dto = plainToInstance(UpdateTicketDto, { subject: 'پاسخ' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('replyToId نامعتبر → خطا', async () => {
    const dto = plainToInstance(UpdateTicketDto, { replyToId: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'replyToId')).toBe(true);
  });
});
