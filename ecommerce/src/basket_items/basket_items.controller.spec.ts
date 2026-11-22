import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { BasketItemsController } from './basket_items.controller';
import { BasketItemsService } from './basket_items.service';

describe('BasketItemsController', () => {
  let controller: BasketItemsController;
  const basketItemsService = {
    getUserBasket: jest.fn(),
    addToBasket: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BasketItemsController],
      providers: [
        { provide: BasketItemsService, useValue: basketItemsService },
      ],
    }).compile();

    controller = module.get<BasketItemsController>(BasketItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create → محصول با statusCode 201 به سبد اضافه می‌شود', async () => {
    basketItemsService.addToBasket.mockResolvedValue({ id: 3 });

    const result = await controller.create(7, {
      productId: 5,
      quantity: 2,
    } as any);

    expect(basketItemsService.addToBasket).toHaveBeenCalledWith(7, {
      productId: 5,
      quantity: 2,
    });
    expect(result.statusCode).toBe(HttpStatus.CREATED);
  });

  it('findAll → سبد کاربر لاگین‌شده برمی‌گردد', async () => {
    basketItemsService.getUserBasket.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll(7);

    expect(basketItemsService.getUserBasket).toHaveBeenCalledWith(7);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });

  it('remove → variantId به عدد تبدیل و پاس داده می‌شود', async () => {
    basketItemsService.removeItem.mockResolvedValue(undefined);

    await controller.remove(7, 5, '9');

    expect(basketItemsService.removeItem).toHaveBeenCalledWith(7, 5, 9);
  });
});
