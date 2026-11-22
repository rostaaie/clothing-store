import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import UserRoleEnum from '../../users/enums/userRoleEnum';

/**
 * کاربران اولیه: یک ادمین، یک کاربر عادی و چند کاربر تستی.
 * (دقیقاً همان کاربرانی که seeder دستی قبلی می‌ساخت)
 *
 * نکته: کاربران با شماره موبایل find-or-create می‌شوند تا دیتای وابسته به کاربر
 * (تیکت، کیف پول، آدرس، ...) با اجرای دوباره‌ی seed از بین نرود.
 */
const USER_DEFS: Array<{
  mobile: string;
  display_name: string;
  password: string;
  role: UserRoleEnum;
}> = [
  {
    mobile: '09123456789',
    display_name: 'مدیر سیستم',
    password: '1234',
    role: UserRoleEnum.Admin,
  },
  {
    mobile: '09987654321',
    display_name: 'کاربر عادی',
    password: 'User123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09111111111',
    display_name: 'تست ادمین',
    password: 'Test123!',
    role: UserRoleEnum.Admin,
  },
  {
    mobile: '09222222222',
    display_name: 'تست کاربر ۱',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09333333333',
    display_name: 'تست کاربر ۲',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  // ─── کاربران عادی بیشتر (برای دیتای فیک سفارش/بوکمارک/کیف پول) ───
  {
    mobile: '09351112233',
    display_name: 'سارا محمدی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351223344',
    display_name: 'علی رضایی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351334455',
    display_name: 'مریم احمدی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351445566',
    display_name: 'حسین کریمی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351556677',
    display_name: 'زهرا حسینی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351667788',
    display_name: 'محمد جوادی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351778899',
    display_name: 'فاطمه موسوی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351889900',
    display_name: 'رضا قاسمی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351990011',
    display_name: 'نگار نادری',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351122334',
    display_name: 'امیر تهرانی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351233445',
    display_name: 'لیلا شریفی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351344556',
    display_name: 'سعید رحیمی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351455667',
    display_name: 'نرگس اکبری',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351566778',
    display_name: 'مهدی صادقی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
  {
    mobile: '09351677889',
    display_name: 'پریسا یوسفی',
    password: 'Test123!',
    role: UserRoleEnum.NormalUser,
  },
];

export default class UserSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);

    let created = 0;
    for (const def of USER_DEFS) {
      const existing = await userRepository.findOne({
        where: { mobile: def.mobile },
      });
      if (existing) continue;

      const hashedPassword = await bcrypt.hash(def.password, 10);
      await userRepository.save(
        userRepository.create({
          mobile: def.mobile,
          display_name: def.display_name,
          password: hashedPassword,
          role: def.role,
        }),
      );
      created++;
    }

    console.log(
      `✅ کاربران seed شدند (${created} ساخته شد، ${USER_DEFS.length - created} از قبل موجود بود)`,
    );
  }
}
