import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { TransactionStatus } from './enums/transaction-status';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,

    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // --------------------------------------------------
  // Get wallet of user (اگر وجود نداشت، با موجودی صفر ساخته می‌شود
  // تا صفحه کیف پول برای کاربری که هنوز کیف پول ندارد خطا ندهد)
  // --------------------------------------------------
  async getUserWallet(userId: number) {
    // اگر کاربر اصلا وجود نداشته باشد، به جای تلاش برای ساخت کیف پول
    // (که باعث خطای FK و 500 می‌شد) 404 برمی‌گردانیم
    const userExists = await this.userRepo.findOne({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
      relations: ['transactions'],
    });

    if (!wallet) {
      wallet = await this.getOrCreateWallet(userId);
      wallet.transactions = []; // شکل پاسخ یکسان با حالت پیدا شدن
    }

    return wallet;
  }

  // --------------------------------------------------
  // Create wallet if not exists
  // --------------------------------------------------
  async getOrCreateWallet(userId: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Wallet) : this.walletRepo;

    let wallet = await repo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      wallet = repo.create({
        user: { id: userId } as User,
        balance: 0,
      });

      wallet = await repo.save(wallet);
    }

    return wallet;
  }

  // --------------------------------------------------
  // Deposit
  // -انتقال به کیف پول-------------------------------------------------
  async deposit(
    userId: number,
    amount: number,
    description: string,
    status: TransactionStatus = TransactionStatus.DEPOSIT,
    manager?: EntityManager,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('مبلغ نامعتبر است');
    }

    const walletRepo = manager
      ? manager.getRepository(Wallet)
      : this.walletRepo;
    const txRepo = manager
      ? manager.getRepository(WalletTransaction)
      : this.txRepo;

    const wallet = await this.getOrCreateWallet(userId, manager);

    // balance ممکن است از دیتابیس به‌صورت string (bigint) برگردد؛ قبل از جمع عددی می‌کنیم
    const currentBalance = Number(wallet.balance) || 0;
    wallet.balance = currentBalance + amount;
    await walletRepo.save(wallet);

    const tx = txRepo.create({
      wallet,
      amount,
      status,
      description,
    });

    await txRepo.save(tx);

    return wallet;
  }

  // --------------------------------------------------
  // Withdraw
  // -برداشت از کیف پول-------------------------------------------------
  async withdraw(
    userId: number,
    amount: number,
    description: string,
    status: TransactionStatus = TransactionStatus.WITHDRAW,
    manager?: EntityManager,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('مبلغ نامعتبر است');
    }

    const walletRepo = manager
      ? manager.getRepository(Wallet)
      : this.walletRepo;
    const txRepo = manager
      ? manager.getRepository(WalletTransaction)
      : this.txRepo;

    const wallet = await this.getOrCreateWallet(userId, manager);

    const currentBalance = Number(wallet.balance) || 0;
    if (currentBalance < amount) {
      throw new BadRequestException('موجودی کیف پول کافی نیست');
    }

    wallet.balance = currentBalance - amount;
    await walletRepo.save(wallet);

    const tx = txRepo.create({
      wallet,
      amount,
      status,
      description,
    });

    await txRepo.save(tx);

    return wallet;
  }

  // --------------------------------------------------
  // All user transactions
  // --------------------------------------------------
  async getUserTransactions(userId: number) {
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      throw new NotFoundException('کیف پول یافت نشد');
    }

    return this.txRepo.find({
      where: { wallet: { id: wallet.id } },
      order: { id: 'DESC' },
    });
  }

  // --------------------------------------------------
  // Wallet transactions
  // --------------------------------------------------
  async getWalletTransactions(walletId: number) {
    const wallet = await this.walletRepo.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('کیف پول پیدا نشد');
    }

    return this.txRepo.find({
      where: { wallet: { id: walletId } },
      order: { id: 'DESC' },
    });
  }

  // --------------------------------------------------
  // Transaction detail
  // --------------------------------------------------
  async getTransactionDetail(txId: number) {
    const tx = await this.txRepo.findOne({
      where: { id: txId },
      relations: ['wallet', 'wallet.user'],
    });

    if (!tx) {
      throw new NotFoundException('تراکنش یافت نشد');
    }

    return tx;
  }
}
