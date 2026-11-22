import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import UserRoleEnum from '../enums/userRoleEnum';
import { Address } from 'src/address/entities/address.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { BookmarkProduct } from 'src/bookmark_products/entities/bookmark_product.entity';
import { BasketItem } from 'src/basket_items/entities/basket_item.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  mobile: string;

  @Column({ nullable: false })
  display_name: string;

  // select: false → هش پسورد در هیچ پاسخ API به‌صورت خودکار برنگردد
  // (جاهایی که واقعاً به پسورد نیاز دارند باید صریحاً addSelect کنند)
  @Column({ nullable: true, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: UserRoleEnum.NormalUser,
  })
  role: UserRoleEnum;

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => Ticket, (ticket) => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => BookmarkProduct, (bookmark) => bookmark.user)
  bookmarkedProducts: BookmarkProduct[];

  @OneToMany(() => BasketItem, (item) => item.user)
  basketItems: BasketItem[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // حذف نرم (soft-delete): مثل فروشگاه‌های واقعی، «حذف کاربر» یعنی غیرفعال‌سازی حساب.
  // ردیف کاربر باقی می‌ماند تا سفارش‌ها و تاریخچه مالی‌اش بدون خطای FK حفظ شود
  // و در صورت نیاز بتوان حساب را بازگردانی کرد.
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
