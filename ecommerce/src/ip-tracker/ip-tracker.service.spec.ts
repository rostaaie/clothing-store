import { IpTrackerService } from './ip-tracker.service';

describe('IpTrackerService', () => {
  let service: IpTrackerService;
  const ipRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IpTrackerService(ipRepo as any);
  });

  describe('handleRequest', () => {
    it('IP جدید → رکورد ساخته می‌شود و بلاک نیست', async () => {
      ipRepo.findOne.mockResolvedValue(null);
      ipRepo.create.mockReturnValue({ ip: '1.2.3.4', requestCount: 1 });

      const blocked = await service.handleRequest('1.2.3.4');

      expect(ipRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '1.2.3.4',
          requestCount: 1,
          isBlocked: false,
        }),
      );
      expect(ipRepo.save).toHaveBeenCalled();
      expect(blocked).toBe(false);
    });

    it('IP بلاک‌شده با بلاک فعال → true (بلاک می‌ماند)', async () => {
      const record = {
        ip: '1.2.3.4',
        requestCount: 1001,
        windowStart: new Date(),
        windowEnd: new Date(),
        isBlocked: true,
        blockedUntil: new Date(Date.now() + 5 * 60 * 1000), // ۵ دقیقه دیگر
      };
      ipRepo.findOne.mockResolvedValue(record);
      ipRepo.save.mockResolvedValue(record);

      const blocked = await service.handleRequest('1.2.3.4');

      expect(blocked).toBe(true);
    });

    it('بلاک منقضی‌شده → ریست می‌شود و مجدداً مجاز است', async () => {
      const record = {
        ip: '1.2.3.4',
        requestCount: 1001,
        windowStart: new Date(),
        windowEnd: new Date(),
        isBlocked: true,
        blockedUntil: new Date(Date.now() - 60 * 1000), // منقضی‌شده
      };
      ipRepo.findOne.mockResolvedValue(record);
      ipRepo.save.mockImplementation(async (r: any) => r);

      const blocked = await service.handleRequest('1.2.3.4');

      expect(record.isBlocked).toBe(false);
      expect(record.blockedUntil).toBeNull();
      expect(blocked).toBe(false);
    });

    it('پنجره یک دقیقه‌ای تمام شده → شمارنده ریست می‌شود', async () => {
      const record = {
        ip: '1.2.3.4',
        requestCount: 500,
        windowStart: new Date(Date.now() - 2 * 60 * 1000),
        windowEnd: new Date(Date.now() - 60 * 1000), // گذشته
        isBlocked: false,
      };
      ipRepo.findOne.mockResolvedValue(record);
      ipRepo.save.mockImplementation(async (r: any) => r);

      await service.handleRequest('1.2.3.4');

      expect(record.requestCount).toBe(1);
    });

    it('بیش از 1000 درخواست در پنجره → بلاک می‌شود', async () => {
      const record = {
        ip: '1.2.3.4',
        requestCount: 1000,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60 * 1000),
        isBlocked: false,
      };
      ipRepo.findOne.mockResolvedValue(record);
      ipRepo.save.mockImplementation(async (r: any) => r);

      const blocked = await service.handleRequest('1.2.3.4');

      expect(record.isBlocked).toBe(true);
      expect(record.blockedUntil).toBeInstanceOf(Date);
      expect(blocked).toBe(true);
    });
  });
});
