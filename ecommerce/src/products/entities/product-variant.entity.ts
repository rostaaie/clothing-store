import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

/**
 * یک ترکیب مشخص از سایز/رنگ برای یک محصول، هرکدام با موجودی جدای خودش.
 * مثال: تی‌شرت مشکی سایز M با موجودی ۵ عدد، تی‌شرت مشکی سایز L با موجودی ۲ عدد.
 * محصولی که نیازی به سایز/رنگ ندارد (مثل کیف ساده) می‌تواند بدون هیچ variant ای
 * باشد؛ در آن حالت موجودی مستقیم از فیلد stock خودِ Product خوانده می‌شود.
 */
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  product: Product;

  // مثل "S"، "M"، "42"؛ اگر محصول سایزبندی ندارد خالی می‌ماند
  @Column({ nullable: true })
  size: string;

  // مثل "مشکی"، "قرمز"؛ اگر محصول رنگ‌بندی ندارد خالی می‌ماند
  @Column({ nullable: true })
  color: string;

  // کد هگز رنگ برای نمایش نمونه‌ی رنگ در فرانت (اختیاری، مثلا #1c1e26)
  @Column({ nullable: true })
  colorCode: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  reservedStock: number;

  @CreateDateColumn()
  createdAt: Date;
}
