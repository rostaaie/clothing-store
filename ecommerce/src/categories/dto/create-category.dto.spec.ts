import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCategoryDto } from './create-category.dto';

describe('CreateCategoryDto', () => {
  const valid = { title: 'موبایل و تبلت' };

  it('داده معتبر → بدون خطا', async () => {
    const dto = plainToInstance(CreateCategoryDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('عنوان کوتاه‌تر از 2 کاراکتر → خطا', async () => {
    const dto = plainToInstance(CreateCategoryDto, { title: 'م' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('parentId عددی معتبر است', async () => {
    const dto = plainToInstance(CreateCategoryDto, { ...valid, parentId: 3 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('parentId برابر null (بدون والد) → بدون خطا', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      ...valid,
      parentId: null,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('parentId غیرعددی → خطا', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      ...valid,
      parentId: 'abc',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'parentId')).toBe(true);
  });
});
