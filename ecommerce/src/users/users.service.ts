import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import UserRoleEnum from './enums/userRoleEnum';
import * as bcrypt from 'bcrypt';
import { userCache } from 'src/common/user-cache';
import { AccountNeedsRestoreException } from 'src/common/account-suspended.exception';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // شماره موبایل بین کاربرانِ فعال یکتاست؛ کاربر حذف‌شده (soft-delete) اینجا پیدا نمی‌شود
    const alreadyUser = await this.findOneMobile(createUserDto.mobile, true);

    if (alreadyUser)
      throw new BadRequestException(
        'there is a user with this mobile number in database',
      );

    // اگر شماره متعلق به کاربر حذف‌شده (غیرفعال) باشد، رزرو باقی می‌ماند؛
    // به جای پیام ابهام‌آمیز دیتابیس، به کاربر اطلاع می‌دهیم حساب باید بازیابی شود.
    const deletedUser = await this.findOneMobileWithDeleted(
      createUserDto.mobile,
    );
    if (deletedUser)
      throw new AccountNeedsRestoreException(
        'این شماره موبایل قبلاً در سیستم ثبت شده است و حساب آن غیرفعال است؛ ' +
          'امکان ثبت‌نام مجدد با این شماره وجود ندارد. برای بازیابی حساب، ' +
          'درخواست خود را از طریق POST /restore-request با همین شماره ثبت کنید.',
      );

    try {
      const newUser = this.userRepository.create(createUserDto);

      const saved = await this.userRepository.save(newUser);
      // هش پسورد نباید در پاسخ برگردد
      const { password, ...safeUser } = saved;
      return safeUser;
    } catch (error) {
      // اگر شماره متعلق به کاربر حذف‌شده باشد، unique دیتابیس جلوی ثبت را می‌گیرد.
      // به جای 500، پیام تمیز برمی‌گردانیم (شماره مثل فروشگاه‌های واقعی رزرو می‌ماند)
      if ((error as { code?: string })?.code === 'ER_DUP_ENTRY')
        throw new BadRequestException(
          'این شماره موبایل قبلاً در سیستم ثبت شده است؛ ' +
            'امکان ثبت‌نام مجدد با این شماره وجود ندارد.',
        );
      throw new BadRequestException('ایجاد کاربر با خطا مواجه شد');
    }
  }

  async findAll(role?: UserRoleEnum, limit: number = 10, page: number = 1) {
    try {
      const query = this.userRepository.createQueryBuilder('users');

      if (role) {
        query.where('users.role = :role', { role });
      }

      query.skip((page - 1) * limit).take(limit);

      return await query.getMany();
    } catch (error) {
      console.log(error);
    }
  }

  async findOne(id: number, withPassword: boolean = false) {
    let query = this.userRepository
      .createQueryBuilder('users')
      .where('users.id = :id', { id });
    // فقط وقتی که واقعاً به هش پسورد نیاز داریم (مثلاً تغییر رمز) آن را هم select می‌کنیم
    if (withPassword) query = query.addSelect('users.password');
    const user = await query.getOne();

    if (!user) throw new NotFoundException('user not found');

    return user;
  }

  async findOneMobile(
    mobile: string,
    checkExist: boolean = false,
    withPassword: boolean = false,
  ) {
    let query = this.userRepository
      .createQueryBuilder('users')
      .where('users.mobile = :mobile', { mobile });
    if (withPassword) query = query.addSelect('users.password');
    const user = await query.getOne();

    if (!checkExist) if (!user) throw new NotFoundException('user not found');

    return user;
  }

  /**
   * جستجوی شماره موبایل در میان کاربرانِ فعال + حذف‌شده (soft-delete).
   * فقط برای بررسی «رزرو بودن» شماره در ثبت‌نام استفاده می‌شود.
   */
  async findOneMobileWithDeleted(mobile: string) {
    return this.userRepository
      .createQueryBuilder('users')
      .withDeleted()
      .where('users.mobile = :mobile', { mobile })
      .getOne();
  }

  // دو روش برای تمیز گرفتن درخواست وجود دارد. یعنی کاربر هرچی دلش خواست بفرستد اما
  // ما فقط فیلد هایی که تعیین کردیم تغییر کند نه هرچیزی که کاربر فرستاده

  // میشه تایپ دیتایی که از بادی درخواست اپدیت میگریم را برابر آپدیت یوزر دی تی او بذاربم اما
  // اگر در اپدیت یوزر دی تی او فراموش کرده باشیم یا تعیین نکره باشیم کاربر فقط قادر به آپدیت چه چیزایی هست
  // اون وقت کاربر میتونه چیزی که نمیخواستیم هم آپدیت کنه

  // اول از همه باید کاری کنیم اپدیت دی تی او از کریت دی تی او پیروی نکنه و فقط کالم هایی که دوست داریم رو بنویسیم
  //سپس از دو روش میتونیم بازم دیتای ورودی رو فیلتر کنیم: یکی فیلتر کردن در سرویس هست و یکی فیلتر کردن در کنترلر

  //روش فیلتر کردن سرویس این جوریه

  /*
  async update(id: number, updateUserDto: UpdateUserDto) {
  const user = this.findOne(id)

  try{
    await this.userRepository.update(id, {
      display_name: updateUserDto.display_name,
      role: updateUserDto.role
  })
    return await this.findOne(id);
} catch{
  throw new BadRequestException('user dosnt update')
}
  }
*/

  //اما من دوس دارم از کنترلر دیتا رو فیلتر کنم و سرویس نرمال باشه

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    try {
      await this.userRepository.update(id, {
        display_name: updateUserDto.display_name,
        role: updateUserDto.role,
      });

      userCache.invalidate(`user:${id}`);
      return await this.findOne(id);
    } catch {
      throw new BadRequestException('updating is failed');
    }
  }

  /**
   * حذف کاربر توسط ادمین = حذف نرم (غیرفعال‌سازی حساب).
   * هیچ داده‌ای پاک نمی‌شود: سفارش‌ها، کیف پول، بوکمارک‌ها، بازدیدها و تاریخچهٔ مالی
   * کاربر دست‌نخورده باقی می‌مانند (الگوی فروشگاه‌های واقعی) و در صورت نیاز با restore قابل بازگردانی است.
   * ثبت‌نام مجدد با شمارهٔ این حساب پیام «درخواست بازیابی» را نشان می‌دهد.
   */
  async remove(
    id: number,
    currentUserId?: number,
  ): Promise<{ message: string }> {
    if (currentUserId === id)
      throw new BadRequestException(
        'نمی‌توانید حساب کاربری خودتان را حذف کنید',
      );

    const user = await this.findOne(id); // کاربر حذف‌شده اینجا پیدا نمی‌شود

    await this.userRepository.softDelete(id);
    userCache.invalidate(`user:${id}`);

    return {
      message: `کاربر ${user.display_name} غیرفعال شد؛ سفارش‌ها و تاریخچه او حفظ شد`,
    };
  }

  /**
   * بازگردانی کاربر حذف‌شده (soft-delete) توسط ادمین
   */
  async restore(id: number) {
    const result = await this.userRepository.restore(id);

    if (!result?.affected)
      throw new NotFoundException('کاربر حذف‌شده‌ای با این شناسه وجود ندارد');

    userCache.invalidate(`user:${id}`);
    return this.getMyProfile(id);
  }

  // ============ پروفایل شخصی کاربر (خودِ کاربر، نه ادمین) ============

  /**
   * دریافت پروفایل خود کاربر بدون فیلد پسورد
   */
  async getMyProfile(id: number) {
    const user = await this.findOne(id);
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * ویرایش نام نمایشی توسط خود کاربر (شماره موبایل و رمز عبور از این مسیر قابل تغییر نیستند)
   */
  async updateMyProfile(id: number, updateProfileDto: UpdateProfileDto) {
    await this.findOne(id);

    try {
      await this.userRepository.update(id, {
        display_name: updateProfileDto.display_name,
      });
      userCache.invalidate(`user:${id}`);
      return await this.getMyProfile(id);
    } catch {
      throw new BadRequestException('ویرایش پروفایل با خطا مواجه شد');
    }
  }

  /**
   * تغییر رمز عبور توسط خود کاربر (نیازمند رمز عبور فعلی صحیح)
   */
  async changeMyPassword(id: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.findOne(id, true);

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('رمز عبور فعلی صحیح نیست');
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    try {
      await this.userRepository.update(id, { password: hashedNewPassword });
      return { message: 'رمز عبور با موفقیت تغییر کرد' };
    } catch {
      throw new BadRequestException('تغییر رمز عبور با خطا مواجه شد');
    }
  }
}
