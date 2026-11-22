import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AddressService } from './address.service';

describe('AddressService', () => {
  let service: AddressService;
  const addressRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };
  const userRepo = { findOneByOrFail: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AddressService(addressRepo as any, userRepo as any);
  });

  describe('create', () => {
    it('کاربر ناموجود → خطا (findOneByOrFail رد می‌شود)', async () => {
      userRepo.findOneByOrFail.mockRejectedValue(new Error('not found'));

      await expect(service.create({} as any, 99)).rejects.toThrow('not found');
    });

    it('موفق → آدرس با کاربر ذخیره می‌شود', async () => {
      userRepo.findOneByOrFail.mockResolvedValue({ id: 1 });
      addressRepo.create.mockReturnValue({ id: 5 });
      addressRepo.save.mockResolvedValue({ id: 5 });

      const result = await service.create({ province: 'تهران' } as any, 1);

      expect(addressRepo.create).toHaveBeenCalledWith({
        province: 'تهران',
        user: { id: 1 },
      });
      expect(result.id).toBe(5);
    });
  });

  describe('findOne (مالکیت)', () => {
    it('آدرس ناموجود → NotFoundException', async () => {
      addressRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('آدرس متعلق به کاربر دیگری باشد → ForbiddenException', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 1, user: { id: 2 } });

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('مالک خودش → برمی‌گردد', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });

      await expect(service.findOne(1, 1)).resolves.toEqual({
        id: 1,
        user: { id: 1 },
      });
    });
  });

  describe('update', () => {
    it('فقط مالک می‌تواند ویرایش کند', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 1, user: { id: 2 } });

      await expect(
        service.update(1, { city: 'کرج' } as any, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ویرایش موفق → ذخیره می‌شود', async () => {
      const address = { id: 1, user: { id: 1 }, city: 'تهران' };
      addressRepo.findOne.mockResolvedValue(address);
      addressRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.update(1, { city: 'کرج' } as any, 1);

      expect(result.city).toBe('کرج');
      expect(addressRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('فقط مالک می‌تواند حذف کند', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 1, user: { id: 2 } });

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('حذف موفق', async () => {
      addressRepo.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });

      await service.remove(1, 1);

      expect(addressRepo.remove).toHaveBeenCalledWith({
        id: 1,
        user: { id: 1 },
      });
    });
  });
});
