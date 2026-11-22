import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RestoreRequestService } from './restore-request.service';

describe('RestoreRequestService', () => {
  let service: RestoreRequestService;

  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
  const usersService = {
    findOneMobileWithDeleted: jest.fn(),
    restore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RestoreRequestService(repo as any, usersService as any);
  });

  describe('create', () => {
    it('برای شماره‌ای که متعلق به حساب غیرفعال نیست، BadRequest پرتاب می‌کند', async () => {
      usersService.findOneMobileWithDeleted.mockResolvedValue(null);

      await expect(service.create('09120000001')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('برای حسابِ فعال (deletedAt صفر) نیز درخواست ثبت نمی‌کند', async () => {
      usersService.findOneMobileWithDeleted.mockResolvedValue({
        deletedAt: null,
      });

      await expect(service.create('09120000001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('اگر درخواست pending موجود باشد، درخواست تکراری را رد می‌کند', async () => {
      usersService.findOneMobileWithDeleted.mockResolvedValue({
        deletedAt: new Date(),
      });
      repo.findOne.mockResolvedValue({
        id: 1,
        mobile: '09120000001',
        status: 'pending',
      });

      await expect(service.create('09120000001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('برای حساب غیرفعال، درخواست جدیدی ثبت می‌کند و status را pending می‌کند', async () => {
      usersService.findOneMobileWithDeleted.mockResolvedValue({
        deletedAt: new Date(),
      });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ mobile: '09120000001' });
      repo.save.mockResolvedValue({
        id: 1,
        mobile: '09120000001',
        status: 'pending',
      });

      const result = await service.create('09120000001');

      expect(repo.create).toHaveBeenCalledWith({
        mobile: '09120000001',
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });

  describe('updateStatus', () => {
    it('اگر درخواست پیدا نشود NotFound می‌پراند', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(1, 'approved')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('وضعیت درخواست را به‌روزرسانی و ذخیره می‌کند', async () => {
      const request = { id: 1, status: 'pending', note: null };
      repo.findOne.mockResolvedValue(request);
      repo.save.mockResolvedValue({ ...request, status: 'approved' });

      const result = await service.updateStatus(1, 'approved', 'تأیید شد');

      expect(result.status).toBe('approved');
      expect(result.note).toBe('تأیید شد');
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('approveAndRestore', () => {
    it('کاربر غیرفعال را بازگردانی و درخواست را approved می‌کند', async () => {
      const request = { id: 1, mobile: '09120000002', status: 'pending' };
      repo.findOne.mockResolvedValue(request);
      usersService.findOneMobileWithDeleted.mockResolvedValue({
        id: 2,
        deletedAt: new Date(),
      });
      usersService.restore.mockResolvedValue({ id: 2, display_name: 'علی' });
      repo.save.mockResolvedValue({ ...request, status: 'approved' });

      const result = await service.approveAndRestore(1, 'تأیید شد');

      expect(usersService.restore).toHaveBeenCalledWith(2);
      expect(result.request.status).toBe('approved');
      expect(result.user.id).toBe(2);
    });

    it('اگر کاربرِ غیرفعال یافت نشود، BadRequest می‌پراند و بازیابی انجام نمی‌شود', async () => {
      repo.findOne.mockResolvedValue({ id: 1, mobile: '09120000002' });
      usersService.findOneMobileWithDeleted.mockResolvedValue(null);

      await expect(service.approveAndRestore(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.restore).not.toHaveBeenCalled();
    });
  });
});
