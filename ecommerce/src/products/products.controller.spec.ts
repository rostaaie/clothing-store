import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    setImage: jest.fn(),
    trackView: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('لیست محصولات را با statusCode 200 برمی‌گرداند', async () => {
      productsService.findAll.mockResolvedValue([{ id: 1 }]);

      const result = await controller.findAll();

      expect(productsService.findAll).toHaveBeenCalled();
      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data).toEqual([{ id: 1 }]);
    });
  });

  describe('findOne', () => {
    it('محصول را برمی‌گرداند و برای کاربر لاگین‌شده بازدید ثبت می‌کند', async () => {
      productsService.findOne.mockResolvedValue({ id: 1 });
      const req = { user: { id: 7 } };

      const result = await controller.findOne(1, req);

      expect(productsService.trackView).toHaveBeenCalledWith(7, 1);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });

    it('کاربر مهمان → بازدیدی ثبت نمی‌شود', async () => {
      productsService.findOne.mockResolvedValue({ id: 1 });

      await controller.findOne(1, {});

      expect(productsService.trackView).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('محصول ساخته‌شده را با statusCode 201 برمی‌گرداند', async () => {
      productsService.create.mockResolvedValue({ id: 2 });

      const result = await controller.create({ title: 'تیشرت' } as any);

      expect(result.statusCode).toBe(HttpStatus.CREATED);
      expect(result.data.id).toBe(2);
    });
  });

  describe('remove', () => {
    it('محصول را حذف می‌کند', async () => {
      productsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(productsService.remove).toHaveBeenCalledWith(1);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });
});
