import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.sevice';
import { RefreshTokenStatus } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    create: jest.fn(),
    findOneMobile: jest.fn(),
    findOneMobileWithDeleted: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const refreshTokenRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET_KEY') return 'refresh-secret';
      return undefined;
    }),
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as any,
      jwtService as any,
      refreshTokenRepo as any,
      configService as any,
    );
  });

  describe('register', () => {
    it('پسورد را هش می‌کند و با نقش user به usersService می‌دهد', async () => {
      usersService.create.mockResolvedValue({ id: 1, mobile: '09123456789' });

      const result = await service.register('09123456789', 'secret123', 'علی');

      expect(usersService.create).toHaveBeenCalledWith({
        display_name: 'علی',
        password: expect.stringMatching(/^\$2[aby]\$\d+\$/), // هش bcrypt
        mobile: '09123456789',
        role: 'user',
      });
      expect(result.id).toBe(1);
    });
  });

  describe('login', () => {
    it('کاربر ناموجود → UnauthorizedException', async () => {
      usersService.findOneMobile.mockResolvedValue(null);
      usersService.findOneMobileWithDeleted.mockResolvedValue(null);

      await expect(service.login('09123456789', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('حساب غیرفعال → خطا با کد ACCOUNT_NEEDS_RESTORE و status 401 (برای نمایش دکمه بازیابی)', async () => {
      usersService.findOneMobile.mockResolvedValue(null);
      usersService.findOneMobileWithDeleted.mockResolvedValue({
        id: 2,
        mobile: '09123456789',
        deletedAt: new Date(),
      });

      try {
        await service.login('09123456789', 'x');
        throw new Error('باید خطا پرتاب می‌شد');
      } catch (raw) {
        const err = raw as {
          status: number;
          response: { code: string; message: string };
        };
        expect(err.status).toBe(401);
        expect(err.response.code).toBe('ACCOUNT_NEEDS_RESTORE');
        expect(err.response.message).toContain('غیرفعال');
      }
    });

    it('رمز عبور اشتباه → UnauthorizedException', async () => {
      usersService.findOneMobile.mockResolvedValue({
        id: 1,
        mobile: '09123456789',
        password: await bcrypt.hash('correct', 10),
      });

      await expect(service.login('09123456789', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('رمز درست → accessToken و refreshToken برمی‌گرداند و payload صحیح را امضا می‌کند', async () => {
      usersService.findOneMobile.mockResolvedValue({
        id: 1,
        mobile: '09123456789',
        display_name: 'علی',
        role: 'user',
        password: await bcrypt.hash('correct', 10),
      });
      jwtService.sign.mockReturnValue('jwt-token');
      jwtService.signAsync.mockResolvedValue('refresh-token');
      refreshTokenRepo.create.mockImplementation((data) => data);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login('09123456789', 'correct');

      expect(result.accessToken).toBe('jwt-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        mobile: '09123456789',
        sub: 1,
        display_name: 'علی',
        role: 'user',
      });
      // refresh توکن با سکرت جداگانه، jti یکتا و expiresIn طولانی امضا می‌شود
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 1,
          type: 'refresh',
          jti: expect.any(String),
        }),
        { secret: 'refresh-secret', expiresIn: '7d' },
      );
      // هش توکن در دیتابیس ذخیره می‌شود
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const hashed = (token: string) =>
      crypto.createHash('sha256').update(token).digest('hex');

    it('توکن منقضی/نامعتبر → UnauthorizedException', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('توکن نوع access (نه refresh) → UnauthorizedException', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: undefined });

      await expect(service.refresh('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('توکن مصرف‌شده/باطل‌شده → UnauthorizedException', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: 'refresh' });
      refreshTokenRepo.findOne.mockResolvedValue(null); // در دیتابیس نیست

      await expect(service.refresh('stolen-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('کاربر soft-delete شده → UnauthorizedException', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: 'refresh' });
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 5,
        status: RefreshTokenStatus.Active,
        expiresAt: new Date(Date.now() + 100000),
        replacedByTokenHash: null,
        userId: 1,
        user: { id: 1, deletedAt: new Date() },
      });

      await expect(service.refresh('t')).rejects.toThrow(UnauthorizedException);
    });

    it('توکن معتبر → rotation انجام می‌شود (قدیمی replaced، جدید صادر) و accessToken تازه برمی‌گردد', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: 'refresh' });
      const record = {
        id: 5,
        status: RefreshTokenStatus.Active,
        expiresAt: new Date(Date.now() + 100000),
        replacedByTokenHash: null,
        userId: 1,
        user: {
          id: 1,
          mobile: '09123456789',
          display_name: 'علی',
          role: 'user',
          deletedAt: null,
        },
      };
      refreshTokenRepo.findOne.mockResolvedValue(record);
      jwtService.signAsync.mockResolvedValue('new-refresh-token');
      jwtService.sign.mockReturnValue('new-access-token');
      refreshTokenRepo.create.mockImplementation((data) => data);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.refresh('current-token');
      const newHash = hashed('new-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      // توکن قدیمی «replaced» می‌شود و به توکن جدید اشاره می‌کند
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(5, {
        status: RefreshTokenStatus.Replaced,
        replacedByTokenHash: newHash,
        lastUsedAt: expect.any(Date),
      });
    });

    it('توکن منقضی‌شده در DB → UnauthorizedException', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: 'refresh' });
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 5,
        status: RefreshTokenStatus.Active,
        expiresAt: new Date(Date.now() - 1000000),
        userId: 1,
        user: { id: 1, deletedAt: null },
      });

      await expect(service.refresh('expired-db')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout و revokeAllUserTokens', () => {
    it('logout → توکن را revoke می‌کند', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ id: 9 });
      await service.logout('some-token');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(9, {
        status: RefreshTokenStatus.Revoked,
      });
    });

    it('logout با توکن ناشناخته → خطا نمی‌دهد', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      const result = await service.logout('unknown');
      expect(result.message).toContain('خروج');
    });

    it('revokeAllUserTokens → همه توکن‌های active کاربر را باطل می‌کند', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 3 });
      const result = await service.revokeAllUserTokens(1);
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 1, status: RefreshTokenStatus.Active },
        { status: RefreshTokenStatus.Revoked },
      );
      expect(result.message).toContain('3');
    });
  });
});
