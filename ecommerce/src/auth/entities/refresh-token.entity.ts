import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

export enum RefreshTokenStatus {
  Active = 'active',
  Revoked = 'revoked',
  Replaced = 'replaced', // توکن جایگزین‌شده (rotated) — دیگر معتبر نیست
}

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  // هش توکن (هرگز خودِ توکن ذخیره نمی‌شود تا در صورت نشت دیتابیس قابل سواستفاده نباشد)
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'enum',
    enum: RefreshTokenStatus,
    default: RefreshTokenStatus.Active,
  })
  status: RefreshTokenStatus;

  // وقتی توکن با rotation جایگزین می‌شود، به توکن جدید اشاره می‌کند (برای revoke زنجیره‌ای)
  @Column({
    type: 'varchar',
    length: 64,
    name: 'replaced_by_token_hash',
    nullable: true,
  })
  replacedByTokenHash: string | null;

  // محدودیت خروجی: اگر null باشد یعنی محدودیتی وجود ندارد (خروجی از همه دستگاه‌ها)
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  // آخرین باری که با این توکن درخواست rfrش انجام شد (برای تشخیص سواستفاده)
  @Column({ name: 'last_used_at', type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
