import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  // mock زنجیره‌ای QueryBuilder
  const qb = {
    where: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };
  const userRepo = {
    createQueryBuilder: jest.fn(() => qb),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(userRepo as any);
  });

  describe('create', () => {
    it('کاربر جدید را ذخیره می‌کند و هش پسورد را از پاسخ حذف می‌کند (رفع نشت)', async () => {
      qb.getOne.mockResolvedValue(null); // موبایل تکراری نیست
      userRepo.create.mockReturnValue({
        id: 1,
        mobile: '09123456789',
        password: 'hash',
      });
      userRepo.save.mockResolvedValue({
        id: 1,
        mobile: '09123456789',
        password: 'hash',
        role: 'user',
      });

      const result = await service.create({
        mobile: '09123456789',
        password: 'hash',
        display_name: 'علی',
      } as any);

      expect(result).not.toHaveProperty('password');
      expect(result.mobile).toBe('09123456789');
    });

    it('موبایل تکراری → BadRequestException', async () => {
      qb.getOne.mockResolvedValue({ id: 1, mobile: '09123456789' });

      await expect(
        service.create({
          mobile: '09123456789',
          password: 'x',
          display_name: 'علی',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('کاربر ناموجود → NotFoundException', async () => {
      qb.getOne.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('بدون withPassword هش پسورد select نمی‌شود', async () => {
      qb.getOne.mockResolvedValue({ id: 1, mobile: '09123456789' });
      await service.findOne(1);
      expect(qb.addSelect).not.toHaveBeenCalled();
    });

    it('با withPassword=true هش پسورد هم select می‌شود', async () => {
      qb.getOne.mockResolvedValue({
        id: 1,
        mobile: '09123456789',
        password: 'hash',
      });
      await service.findOne(1, true);
      expect(qb.addSelect).toHaveBeenCalledWith('users.password');
    });
  });

  describe('getMyProfile', () => {
    it('فیلد پسورد را از پروفایل حذف می‌کند', async () => {
      qb.getOne.mockResolvedValue({
        id: 1,
        mobile: '09123456789',
        password: 'hash',
      });
      const profile = await service.getMyProfile(1);
      expect(profile).not.toHaveProperty('password');
    });
  });

  describe('changeMyPassword', () => {
    it('رمز فعلی اشتباه → UnauthorizedException', async () => {
      qb.getOne.mockResolvedValue({
        id: 1,
        password: await bcrypt.hash('real', 10),
      });
      await expect(
        service.changeMyPassword(1, {
          currentPassword: 'wrong',
          newPassword: 'new123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('رمز فعلی درست → پسورد جدید هش و ذخیره می‌شود', async () => {
      qb.getOne.mockResolvedValue({
        id: 1,
        password: await bcrypt.hash('real', 10),
      });
      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.changeMyPassword(1, {
        currentPassword: 'real',
        newPassword: 'new123',
      });

      expect(userRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          password: expect.stringMatching(/^\$2[aby]\$/),
        }),
      );
      expect(result.message).toContain('موفقیت');
    });
  });

  describe('remove', () => {
    it('حذف حسابِ خودِ ادمین → BadRequestException و بدون softDelete', async () => {
      await expect(service.remove(7, 7)).rejects.toThrow(BadRequestException);
      expect(userRepo.softDelete).not.toHaveBeenCalled();
    });

    it('کاربر ناموجود → NotFoundException', async () => {
      qb.getOne.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });

    it('کاربر موجود → حذف نرم (بدون پاک کردن هیچ داده‌ای) و پیام با نام کاربر', async () => {
      qb.getOne.mockResolvedValue({ id: 1, display_name: 'پریسا یوسفی' });
      userRepo.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1, 2);

      expect(userRepo.softDelete).toHaveBeenCalledWith(1);
      // هیچ داده‌ای (بوکمارک/بازدید/سفارش) نباید پاک شود
      expect(userRepo.delete).not.toHaveBeenCalled();
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(result.message).toContain('پریسا یوسفی');
    });
  });

  describe('restore', () => {
    it('کاربر حذف‌شده‌ای وجود ندارد → NotFoundException', async () => {
      userRepo.restore.mockResolvedValue({ affected: 0 });
      await expect(service.restore(99)).rejects.toThrow(NotFoundException);
    });

    it('بازگردانی موفق → پروفایل بدون پسورد برمی‌گردد', async () => {
      userRepo.restore.mockResolvedValue({ affected: 1 });
      qb.getOne.mockResolvedValue({
        id: 1,
        mobile: '09123456789',
        password: 'hash',
      });

      const profile = await service.restore(1);

      expect(userRepo.restore).toHaveBeenCalledWith(1);
      expect(profile).not.toHaveProperty('password');
    });
  });
});
