import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create → کاربر با statusCode 201 ساخته می‌شود', async () => {
    usersService.create.mockResolvedValue({ id: 1 });

    const result = await controller.create({ mobile: '09123456789' } as any);

    expect(usersService.create).toHaveBeenCalled();
    expect(result.statusCode).toBe(HttpStatus.CREATED);
  });

  it('findAll → فیلتر نقش و صفحه‌بندی به سرویس پاس داده می‌شود', async () => {
    usersService.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll('admin', 5, 2);

    expect(usersService.findAll).toHaveBeenCalledWith('admin', 5, 2);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });

  it('remove → کاربر حذف (غیرفعال) می‌شود و پیام سرویس برمی‌گردد', async () => {
    usersService.remove.mockResolvedValue({
      message: 'کاربر تست غیرفعال شد',
    });

    const result = await controller.remove(1, 2);

    expect(usersService.remove).toHaveBeenCalledWith(1, 2);
    expect(result.statusCode).toBe(HttpStatus.OK);
    expect(result.message).toContain('غیرفعال');
  });
});
