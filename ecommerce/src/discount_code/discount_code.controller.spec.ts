import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DiscountCodeController } from './discount_code.controller';
import { DiscountCodeService } from './discount_code.service';

describe('DiscountCodeController', () => {
  let controller: DiscountCodeController;
  const discountCodeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountCodeController],
      providers: [
        { provide: DiscountCodeService, useValue: discountCodeService },
      ],
    }).compile();

    controller = module.get<DiscountCodeController>(DiscountCodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create → کد تخفیف با statusCode 201', async () => {
    discountCodeService.create.mockResolvedValue({ id: 1, code: 'SUMMER' });

    const result = await controller.create({ code: 'SUMMER' } as any);

    expect(discountCodeService.create).toHaveBeenCalled();
    expect(result.statusCode).toBe(HttpStatus.CREATED);
  });

  it('findAll → لیست کدها با statusCode 200', async () => {
    discountCodeService.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll();

    expect(result.statusCode).toBe(HttpStatus.OK);
    expect(result.data).toHaveLength(1);
  });

  it('remove → کد حذف می‌شود', async () => {
    discountCodeService.remove.mockResolvedValue(undefined);

    const result = await controller.remove(1);

    expect(discountCodeService.remove).toHaveBeenCalledWith(1);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });
});
