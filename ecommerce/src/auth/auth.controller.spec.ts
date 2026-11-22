import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.sevice';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('ثبت‌نام → فیلدها به سرویس پاس و statusCode 201 برمی‌گردد', async () => {
      authService.register.mockResolvedValue({ id: 1 });

      const result = await controller.register({
        mobile: '09123456789',
        password: 'secret123',
        display_name: 'علی',
      } as any);

      expect(authService.register).toHaveBeenCalledWith(
        '09123456789',
        'secret123',
        'علی',
      );
      expect(result.statusCode).toBe(HttpStatus.CREATED);
    });
  });

  describe('login', () => {
    it('ورود → توکن برمی‌گرداند و statusCode 200 دارد', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      });

      const result = await controller.login({
        mobile: '09123456789',
        password: 'x',
      } as any);

      expect(authService.login).toHaveBeenCalledWith('09123456789', 'x');
      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data.accessToken).toBe('jwt-token');
    });
  });

  describe('refresh', () => {
    it('refresh → توکن تازه برمی‌گرداند و statusCode 200 دارد', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await controller.refresh(
        { refreshToken: 'old-refresh' } as any,
        { headers: {}, socket: { remoteAddress: '::1' } } as any,
      );

      expect(authService.refresh).toHaveBeenCalledWith('old-refresh', '::1');
      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data.accessToken).toBe('new-access');
      expect(result.data.refreshToken).toBe('new-refresh');
    });
  });

  describe('logout', () => {
    it('logout → سرویس logout صدا و statusCode 200 برمی‌گردد', async () => {
      authService.logout.mockResolvedValue({ message: 'خروج انجام شد' });

      const result = await controller.logout({ refreshToken: 't' } as any);

      expect(authService.logout).toHaveBeenCalledWith('t');
      expect(result.statusCode).toBe(HttpStatus.OK);
    });
  });
});
