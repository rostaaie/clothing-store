import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { WalletTransaction } from './wallet-transaction.entity';

// MySQL با bigint مقدار را به‌صورت string برمی‌گرداند؛ این تبدیل باعث می‌شود
// در کل اپلیکیشن (سرویس، تست، فرانت) balance همیشه عدد (number) باشد.
const balanceTransformer = {
  to: (value?: number) => value ?? 0,
  from: (value?: string | number) =>
    value == null ? 0 : typeof value === 'number' ? value : Number(value),
};

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: 0,
    type: 'bigint',
    transformer: balanceTransformer,
  })
  balance: number; // موجودی

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => WalletTransaction, (tx) => tx.wallet)
  transactions: WalletTransaction[];

  // اگر کاربر به‌صورت قطعی پاک شود، کیف پولش هم پاک می‌شود
  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // سمت مالک رابطه — ستون userId روی جدول wallet ساخته می‌شود
  user: User;
}
