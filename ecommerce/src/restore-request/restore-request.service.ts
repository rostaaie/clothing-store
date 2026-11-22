import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestoreRequest } from './entities/restore-request.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class RestoreRequestService {
  constructor(
    @InjectRepository(RestoreRequest)
    private readonly restoreRequestRepo: Repository<RestoreRequest>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * ثبت درخواست بازیابی حساب توسط کاربری که حسابش غیرفعال شده است (بدون لاگین).
   * شماره باید متعلق به یک حساب غیرفعال باشد، در غیر این صورت درخواست ثبت نمی‌شود.
   */
  async create(mobile: string) {
    // بررسی: آیا شماره متعلق به یک حساب غیرفعال (soft-delete) است؟
    // findOneMobileWithDeleted میان کاربرانِ فعال + حذف‌شده جستجو می‌کند؛
    // پس باید مطمئن شویم کاربر واقعاً حذف‌شده (غیرفعال) است نه اینکه حساب فعالی دارد.
    const deletedUser =
      await this.usersService.findOneMobileWithDeleted(mobile);
    if (!deletedUser?.deletedAt) {
      throw new BadRequestException(
        'شماره‌ای که وارد کرده‌اید متعلق به یک حساب غیرفعال نیست؛ ' +
          'اگر حساب فعال دارید از طریق ورود/بازیابی استفاده کنید.',
      );
    }

    const existing = await this.restoreRequestRepo.findOne({
      where: { mobile },
    });

    if (existing) {
      if (existing.status === 'pending')
        throw new BadRequestException(
          'درخواست بازیابی برای این شماره قبلاً ثبت شده و در انتظار بررسی است',
        );
      // اگر قبلاً رد یا تأیید شده بود، برای درخواست جدید دوباره pending می‌کنیم
      existing.status = 'pending';
      existing.note = null;
      await this.restoreRequestRepo.save(existing);
      return existing;
    }

    const request = this.restoreRequestRepo.create({ mobile });
    return await this.restoreRequestRepo.save(request);
  }

  /**
   * لیست درخواست‌های بازیابی برای ادمین.
   * برای هر درخواست، کاربرِ غیرفعالِ مرتبط با همان شماره نیز ضمیمه می‌شود
   * تا ادمین نام/شناسه کاربر را ببیند.
   */
  async findAll(status?: 'pending' | 'approved' | 'rejected') {
    const requests = await this.restoreRequestRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      requests.map(async (request) => {
        const user = await this.usersService.findOneMobileWithDeleted(
          request.mobile,
        );
        return {
          ...request,
          user: user ? { id: user.id, display_name: user.display_name } : null,
        };
      }),
    );
  }

  /**
   * تأیید/رد یک درخواست توسط ادمین.
   * ادمین بعد از این‌جا، بازیابی واقعی حساب را از طریق users/:id/restore انجام می‌دهد.
   */
  async updateStatus(
    id: number,
    status: 'approved' | 'rejected',
    note?: string,
  ) {
    const request = await this.restoreRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('درخواست بازیابی یافت نشد');

    request.status = status;
    if (note) request.note = note;
    await this.restoreRequestRepo.save(request);
    return request;
  }

  /**
   * تأیید درخواست و بازگردانیِ واقعی حسابِ غیرفعال (یک اقدام برای ادمین).
   * چون شماره موبایل یکتاست، کاربرِ حذف‌شده‌ی مربوط به همین شماره پیدا و بازگردانی می‌شود.
   */
  async approveAndRestore(id: number, note?: string) {
    const request = await this.restoreRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('درخواست بازیابی یافت نشد');

    const deletedUser = await this.usersService.findOneMobileWithDeleted(
      request.mobile,
    );
    if (!deletedUser?.deletedAt)
      throw new BadRequestException(
        'کابری با این شماره به‌صورت غیرفعال یافت نشد؛ شاید قبلاً بازگردانی شده باشد.',
      );

    const restored = await this.usersService.restore(deletedUser.id);

    request.status = 'approved';
    if (note) request.note = note;
    await this.restoreRequestRepo.save(request);

    return { request, user: restored };
  }

  async remove(id: number) {
    const request = await this.restoreRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('درخواست بازیابی یافت نشد');
    await this.restoreRequestRepo.remove(request);
    return { message: 'درخواست بازیابی حذف شد' };
  }
}
