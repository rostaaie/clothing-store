import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Address } from 'src/address/entities/address.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status';
import { DiscountCode } from 'src/discount_code/entities/discount_code.entity';
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.orders, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user: User;

  @ManyToOne(() => Address, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @ManyToOne(() => DiscountCode, (code) => code.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  discountCode: DiscountCode;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @CreateDateColumn({ name: 'set_time' })
  createdAt: Date;

  @Column({ name: 'total_price', type: 'bigint' })
  totalPrice: number;

  @Column({ type: 'bigint', default: 0 })
  discountAmount: number;

  @Column({ name: 'final_price', type: 'bigint' })
  finalPrice: number;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  // زمان ثبت درخواست پرداخت (POST /orders/:id/pay) — بدون آن، verify پذیرفته نمی‌شود
  @Column({ type: 'timestamp', nullable: true })
  paymentRequestedAt: Date;

  // کد پیگیری (authority) صادرشده توسط درگاه هنگام درخواست پرداخت — باید با Authority ارسالی به verify یکی باشد
  @Column({ type: 'varchar', nullable: true })
  paymentAuthority: string | null;
}
