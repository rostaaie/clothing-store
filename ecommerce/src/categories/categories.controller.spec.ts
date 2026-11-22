import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const categoriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    removeOnlyCategory: jest.fn(),
    setImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: categoriesService }],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll → دسته‌بندی‌ها با statusCode 200', async () => {
    categoriesService.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll();

    expect(result.statusCode).toBe(HttpStatus.OK);
    expect(result.data).toHaveLength(1);
  });

  it('create → دسته‌بندی با statusCode 201', async () => {
    categoriesService.create.mockResolvedValue({ id: 2 });

    const result = await controller.create({ title: 'موبایل' } as any);

    expect(categoriesService.create).toHaveBeenCalled();
    expect(result.statusCode).toBe(HttpStatus.CREATED);
  });

  it('remove → از متد removeOnlyCategory استفاده می‌شود', async () => {
    categoriesService.removeOnlyCategory.mockResolvedValue(undefined);

    const result = await controller.remove(1);

    expect(categoriesService.removeOnlyCategory).toHaveBeenCalledWith(1);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });
});
