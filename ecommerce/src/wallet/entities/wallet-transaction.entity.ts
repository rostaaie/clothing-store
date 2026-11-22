import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { TransactionStatus } from '../enums/transaction-status';

@Entity()
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  // اگر کیف پول پاک شد، تراکنش‌هایش هم پاک می‌شود
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
  })
  status: TransactionStatus;

  @Column({ type: 'int' })
  amount: number;

  @Column()
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
