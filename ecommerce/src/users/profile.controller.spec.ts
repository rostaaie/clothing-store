import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UsersService } from './users.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  const usersService = {
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    changeMyPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyProfile → پروفایل کاربر لاگین‌شده با statusCode 200', async () => {
    usersService.getMyProfile.mockResolvedValue({ id: 1, display_name: 'علی' });

    const result = await controller.getMyProfile(1);

    expect(usersService.getMyProfile).toHaveBeenCalledWith(1);
    expect(result.statusCode).toBe(HttpStatus.OK);
  });

  it('changeMyPassword → پیام سرویس را برمی‌گرداند', async () => {
    usersService.changeMyPassword.mockResolvedValue({
      message: 'رمز عبور تغییر کرد',
    });

    const result = await controller.changeMyPassword(1, {} as any);

    expect(result.message).toBe('رمز عبور تغییر کرد');
  });
});
