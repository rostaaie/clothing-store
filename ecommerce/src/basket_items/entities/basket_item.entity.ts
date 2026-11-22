import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';
@Entity('basket_items')
export class BasketItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 1 })
  quantity: number;

  @ManyToOne(() => User, (user) => user.basketItems, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Product, (product) => product.basketItems, {
    onDelete: 'CASCADE',
  })
  product: Product;

  // ترکیب سایز/رنگ انتخابی؛ اگر محصول variant نداشته باشد این فیلد خالی می‌ماند
  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE', nullable: true })
  variant: ProductVariant | null;

  @CreateDateColumn()
  createdAt: Date;
}
