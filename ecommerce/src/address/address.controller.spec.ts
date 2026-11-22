import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';

describe('AddressController', () => {
  let controller: AddressController;
  const addressService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [{ provide: AddressService, useValue: addressService }],
    }).compile();

    controller = module.get<AddressController>(AddressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create → آدرس با userId کاربر لاگین‌شده ساخته می‌شود', async () => {
    addressService.create.mockResolvedValue({ id: 1 });

    const result = await controller.create(7, {} as any);

    expect(addressService.create).toHaveBeenCalledWith(expect.anything(), 7);
    expect(result.statusCode).toBe(HttpStatus.CREATED);
  });

  it('findAll → فقط آدرس‌های همان کاربر برمی‌گردد', async () => {
    addressService.findAllByUser.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll(7);

    expect(addressService.findAllByUser).toHaveBeenCalledWith(7);
    expect(result.data).toHaveLength(1);
  });

  it('remove → آدرس حذف می‌شود', async () => {
    addressService.remove.mockResolvedValue(undefined);

    const result = await controller.remove(1, 7);

    expect(addressService.remove).toHaveBeenCalledWith(1, 7);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });
});
