import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';

@Entity()
export class DiscountCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'int', nullable: true })
  percent: number;

  @Column({ type: 'int', nullable: true })
  amount: number; //تخفیف غیر درصدی

  @Column({ type: 'int', default: 0 })
  maxUsage: number; //سقف مجاز استفاده

  @Column({ type: 'int', default: 0 })
  usageCount: number; //تا الان چندبار استفاده شده

  @Column({ type: 'timestamp', nullable: true })
  expireAt: Date;

  @Column({ type: 'int', default: 0 })
  minPurchaseAmount: number; //حداقل مبلغ خرید برای فعال شدن تخفیف

  @OneToMany(() => Order, (order) => order.discountCode)
  orders: Order[];
}
