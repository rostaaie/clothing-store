import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * جدول ثبت بازدید کاربران از محصولات
 * برای استفاده در سیستم پیشنهاد محصول بر اساس علاقه‌مندی
 */
@Entity('product_views')
@Index(['userId', 'productId'], { unique: true })
export class ProductView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  productId: number;

  @Column({ default: 1 })
  viewCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastViewedAt: Date;
}
