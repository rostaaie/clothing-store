import { NotFoundException } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { v4 as uuid } from 'uuid';

describe('TicketService', () => {
  let service: TicketService;
  const ticketRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };

  // کاربر عادی با id=1، کاربر عادی دیگر با id=2 و ادمین
  const owner = { id: 1, role: 'user' };
  const stranger = { id: 2, role: 'user' };
  const admin = { id: 99, role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TicketService(ticketRepo as any);
    ticketRepo.create.mockImplementation((x: any) => x); // همان ورودی را برمی‌گرداند
  });

  describe('create', () => {
    it('تیکت ریشه (بدون replyToId) → id و rootTicketId یکی می‌شوند', async () => {
      ticketRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.create(
        {
          title: 'مشکل',
          subject: 'پشتیبانی',
          description: 'توضیح کامل تستی',
          userId: 1,
        } as any,
        owner,
      );

      expect(result.id).toBeDefined();
      expect(result.rootTicketId).toBe(result.id);
    });

    it('ریپلای صاحب مکالمه → rootTicketId از تیکت والد گرفته می‌شود', async () => {
      const rootId = uuid();
      // اولین findOne: تیکت والد، دومین findOne: تیکت ریشه (صاحب مکالمه)
      ticketRepo.findOne
        .mockResolvedValueOnce({ id: 'parent-id', rootTicketId: rootId })
        .mockResolvedValueOnce({ id: rootId, userId: owner.id });
      ticketRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.create(
        {
          title: 'پاسخ',
          subject: 'پشتیبانی',
          description: 'توضیح کامل تستی',
          replyToId: 'parent-id',
          userId: owner.id,
        } as any,
        owner,
      );

      expect(ticketRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: 'parent-id' },
      });
      expect(result.rootTicketId).toBe(rootId);
      expect(result.id).toBeUndefined(); // برای ریپلای id خودکار ساخته شود
    });

    it('ریپلای ادمین به مکالمه هر کاربر مجاز است', async () => {
      const rootId = uuid();
      ticketRepo.findOne.mockResolvedValueOnce({
        id: 'parent-id',
        rootTicketId: rootId,
      });
      ticketRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.create(
        {
          title: 'پاسخ پشتیبانی',
          subject: 'پشتیبانی',
          description: 'توضیح کامل تستی',
          replyToId: 'parent-id',
          userId: admin.id,
        } as any,
        admin,
      );

      expect(result.rootTicketId).toBe(rootId);
      // برای ادمین نیازی به خواندن تیکت ریشه نیست
      expect(ticketRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('ریپلای کاربر عادی به مکالمه دیگران → NotFoundException و ذخیره نمی‌شود', async () => {
      const rootId = uuid();
      ticketRepo.findOne
        .mockResolvedValueOnce({ id: 'parent-id', rootTicketId: rootId })
        .mockResolvedValueOnce({ id: rootId, userId: owner.id });

      await expect(
        service.create(
          {
            title: 'پاسخ',
            subject: 'x',
            description: 'توضیح کامل تستی',
            replyToId: 'parent-id',
            userId: stranger.id,
          } as any,
          stranger,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(ticketRepo.save).not.toHaveBeenCalled();
    });

    it('والد ناموجود → NotFoundException', async () => {
      ticketRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'پاسخ',
            subject: 'x',
            description: 'توضیح کامل تستی',
            replyToId: 'nope',
            userId: 1,
          } as any,
          owner,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('تیکت ناموجود → NotFoundException', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('x', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('صاحب مکالمه تیکت را می‌بیند', async () => {
      ticketRepo.findOne
        .mockResolvedValueOnce({ id: 't1', rootTicketId: 'r1' })
        .mockResolvedValueOnce({ id: 'r1', userId: owner.id });
      const result = await service.findOne('t1', owner);
      expect(result.id).toBe('t1');
    });

    it('کاربر دیگر → NotFoundException (نه افشای وجود تیکت)', async () => {
      ticketRepo.findOne
        .mockResolvedValueOnce({ id: 't1', rootTicketId: 'r1' })
        .mockResolvedValueOnce({ id: 'r1', userId: owner.id });
      await expect(service.findOne('t1', stranger)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ادمین هر تیکتی را می‌بیند', async () => {
      ticketRepo.findOne.mockResolvedValueOnce({ id: 't1', rootTicketId: 'r1' });
      const result = await service.findOne('t1', admin);
      expect(result.id).toBe('t1');
    });
  });

  describe('getConversation', () => {
    it('صاحب مکالمه پیام‌ها را می‌گیرد', async () => {
      ticketRepo.findOne.mockResolvedValue({ id: 'r1', userId: owner.id });
      ticketRepo.find.mockResolvedValue([{ id: 'r1' }, { id: 'm2' }]);
      const result = await service.getConversation('r1', owner);
      expect(result).toHaveLength(2);
    });

    it('کاربر دیگر → NotFoundException و پیام‌ها خوانده نمی‌شوند', async () => {
      ticketRepo.findOne.mockResolvedValue({ id: 'r1', userId: owner.id });
      await expect(service.getConversation('r1', stranger)).rejects.toThrow(
        NotFoundException,
      );
      expect(ticketRepo.find).not.toHaveBeenCalled();
    });

    it('شناسه ریشه ناموجود برای کاربر عادی → NotFoundException', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(service.getConversation('nope', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ادمین بدون بررسی مالکیت مکالمه را می‌گیرد', async () => {
      ticketRepo.find.mockResolvedValue([{ id: 'r1' }]);
      const result = await service.getConversation('r1', admin);
      expect(result).toHaveLength(1);
      expect(ticketRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('تیکت ناموجود → NotFoundException', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('تیکت موجود حذف می‌شود', async () => {
      ticketRepo.findOne.mockResolvedValue({ id: 't1' });
      const result = await service.remove('t1');
      expect(ticketRepo.remove).toHaveBeenCalled();
      expect(result.message).toContain('deleted');
    });
  });
});