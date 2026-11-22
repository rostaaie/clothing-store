import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCategoryDto } from './update-category.dto';

describe('UpdateCategoryDto', () => {
  it('بدون فیلد → معتبر', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('title معتبر → بدون خطا', async () => {
    const dto = plainToInstance(UpdateCategoryDto, { title: 'کفش' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('parentId غیرعددی → خطا', async () => {
    const dto = plainToInstance(UpdateCategoryDto, { parentId: 'xyz' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'parentId')).toBe(true);
  });
});
