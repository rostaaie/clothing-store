import { User } from 'src/users/entities/user.entity';
import {
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from 'src/products/entities/product.entity';

@Entity('bookmark_products')
@Unique(['user', 'product']) // باعث می‌شود کاربر یک محصول را دوبار بوکمارک نکند
export class BookmarkProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.bookmarkedProducts, {
    onDelete: 'CASCADE',
  }) //یعنی اگر کاربر حذف شد، بوکمارک‌هایش هم پاک می‌شود
  user: User;

  @ManyToOne(() => Product, (product) => product.bookmarkedBy, {
    onDelete: 'CASCADE',
  })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;
}
