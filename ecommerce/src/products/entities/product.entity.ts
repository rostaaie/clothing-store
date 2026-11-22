import { Category } from 'src/categories/entities/category.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookmarkProduct } from 'src/bookmark_products/entities/bookmark_product.entity';
import { BasketItem } from 'src/basket_items/entities/basket_item.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  reservedStock: number;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToMany(() => Category, (category) => category.products)
  //در رابطه چند به چند فقط یک طرف باید جوین تیبل داشته باشد.
  //اگر هر دو طرف بگذارند دو جدول واسط ساخته می‌شود
  @JoinTable({
    name: 'product_category', //اسم جدول واسط
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    //  اسم ستون جدول واسط پروداکت_ایدی باشه
    //در جدول واسط، ستون "پروداکت_ایدی" باید به کدام ستون از جدول "پروداکت" وصل شود؟
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @OneToMany(() => BookmarkProduct, (bookmark) => bookmark.product)
  bookmarkedBy: BookmarkProduct[];

  @OneToMany(() => BasketItem, (basketItem) => basketItem.product)
  basketItems: BasketItem[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];

  // ترکیب‌های سایز/رنگ محصول؛ اگر خالی باشد یعنی محصول ساده است و همان stock بالا معتبر است
  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
