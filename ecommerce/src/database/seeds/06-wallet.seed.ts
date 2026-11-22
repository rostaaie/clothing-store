import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { WalletTransaction } from '../../wallet/entities/wallet-transaction.entity';
import { TransactionStatus } from '../../wallet/enums/transaction-status';
import UserRoleEnum from '../../users/enums/userRoleEnum';

/**
 * کیف پول و تراکنش‌های نمونه برای کاربران عادی تا صفحه‌ی کیف پول
 * موجودی و تاریخچه‌ی واقعی داشته باشد.
 */
export default class WalletSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const walletRepository = dataSource.getRepository(Wallet);
    const txRepository = dataSource.getRepository(WalletTransaction);

    const users = await userRepository.find({
      where: { role: UserRoleEnum.NormalUser },
    });
    if (users.length === 0) {
      console.warn('⚠️ کاربر عادی‌ای برای کیف پول وجود ندارد');
      return;
    }

    let wallets = 0;
    let transactions = 0;

    for (const user of users) {
      // موجودی تصادفی ۰ تا ۲ میلیون تومان (پله‌های ۱۰۰ هزار تومانی)
      const balance = Math.floor(Math.random() * 20) * 100000;

      const wallet = await walletRepository.save(
        walletRepository.create({ user, balance }),
      );
      wallets++;

      // شارژ اولیه به اندازه‌ی موجودی
      await txRepository.save(
        txRepository.create({
          wallet,
          amount: balance,
          status: TransactionStatus.DEPOSIT,
          description: 'شارژ اولیه کیف پول',
        }),
      );
      transactions++;

      // ۱ تا ۳ تراکنش خرید/برداشت کوچک‌تر
      const txCount = Math.floor(Math.random() * 3);
      for (let i = 0; i < txCount; i++) {
        const amount = 50000 + Math.floor(Math.random() * 20) * 50000;
        const isPurchase = Math.random() < 0.6;
        await txRepository.save(
          txRepository.create({
            wallet,
            amount,
            status: isPurchase
              ? TransactionStatus.PURCHASE
              : TransactionStatus.WITHDRAW,
            description: isPurchase ? 'خرید از فروشگاه' : 'برداشت از کیف پول',
          }),
        );
        transactions++;
      }
    }

    console.log(
      `✅ ${wallets} کیف پول با ${transactions} تراکنش برای کاربران seed شد`,
    );
  }
}
