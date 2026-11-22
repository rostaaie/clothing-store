import { Column, Entity, ManyToOne } from 'typeorm';
import { PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items)
  order: Order;

  @ManyToOne(() => Product, (product) => product.orderItems)
  product: Product;

  // ترکیب سایز/رنگ خریداری‌شده (اگر بعداً variant حذف شود این relation خالی می‌شود
  // ولی variantSize/variantColor به‌عنوان یادداشت ثابت در تاریخچه‌ی سفارش باقی می‌مانند)
  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL', nullable: true })
  variant: ProductVariant | null;

  @Column({ nullable: true })
  variantSize: string;

  @Column({ nullable: true })
  variantColor: string;

  @Column({ type: 'bigint' })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'bigint' })
  total: number;
}
