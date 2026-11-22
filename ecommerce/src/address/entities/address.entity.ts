import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  province: string;

  @Column({ nullable: false })
  city: string;

  @Column({ nullable: false })
  adress: string;

  @Column({ nullable: false, length: 10 })
  postal_code: string;

  @Column({ length: 11 })
  reciver_mobile: string;

  @Column({ nullable: true })
  description: string;

  // اگر کاربر به‌صورت قطعی پاک شود، آدرس‌هایش هم پاک می‌شود (داده شخصی)
  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
