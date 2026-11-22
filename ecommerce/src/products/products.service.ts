import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { In, Repository } from 'typeorm';
import { Category } from 'src/categories/entities/category.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { ProductView } from 'src/recommender/entities/product-view.entity';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(ProductView)
    private readonly productViewRepository: Repository<ProductView>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  /**
   * وقتی محصول variant (سایز/رنگ) دارد، stock/reservedStock نمایشی محصول را
   * از جمع variant ها محاسبه می‌کند تا هر جای دیگر پروژه که همچنان product.stock
   * را می‌خواند (مثل کارت محصول یا جدول ادمین) عدد درست و به‌روز را ببیند.
   */
  private withComputedStock(product: Product): Product {
    if (product.variants?.length) {
      product.stock = product.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0,
      );
      product.reservedStock = product.variants.reduce(
        (sum, v) => sum + (v.reservedStock || 0),
        0,
      );
    }
    return product;
  }

  async create(createProductDto: CreateProductDto) {
    const {
      title,
      description,
      price,
      stock,
      categoryIds,
      imageUrl,
      variants,
    } = createProductDto;
    const product = this.productRepository.create({
      title,
      description,
      price,
      stock: stock ?? 0,
      imageUrl,
    });

    if (categoryIds?.length) {
      const categories = await this.categoryRepository.findBy({
        id: In(categoryIds),
      });
      const foundIds = categories.map((c) => c.id);
      const missingIds = categoryIds.filter((id) => !foundIds.includes(id));

      if (missingIds.length) {
        throw new BadRequestException(
          `دسته‌بندی‌های زیر یافت نشدند: ${missingIds.join(', ')}`,
        );
      }
      product.categories = categories;
    }

    if (variants?.length) {
      product.variants = variants.map((v) =>
        this.variantRepository.create({
          size: v.size,
          color: v.color,
          colorCode: v.colorCode,
          stock: v.stock,
        }),
      );
    }

    const saved = await this.productRepository.save(product);
    return this.findOne(saved.id);
  }

  async findAll() {
    const products = await this.productRepository.find({
      relations: { categories: true, variants: true },
    });
    return products.map((p) => this.withComputedStock(p));
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { categories: true, variants: true },
    });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    return this.withComputedStock(product);
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const {
      title,
      price,
      stock,
      description,
      categoryIds,
      imageUrl,
      variants,
    } = updateProductDto;
    const product: Product = await this.findOne(id);

    if (title !== undefined) product.title = title;
    if (price != null) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (description !== undefined) product.description = description;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (categoryIds !== undefined) {
      const categories = await this.categoryRepository.findBy({
        id: In(categoryIds),
      });
      product.categories = categories;
    }

    // اگر variants ارسال شده باشد (حتی آرایه‌ی خالی)، کل ترکیب‌های سایز/رنگ قبلی
    // را با لیست جدید جایگزین می‌کنیم؛ ساده‌ترین راه برای همگام نگه‌داشتن فرم ادمین
    if (variants !== undefined) {
      await this.variantRepository.delete({ product: { id } });
      product.variants = variants.length
        ? variants.map((v) =>
            this.variantRepository.create({
              size: v.size,
              color: v.color,
              colorCode: v.colorCode,
              stock: v.stock,
            }),
          )
        : [];
    }

    await this.productRepository.save(product);
    return this.findOne(id);
  }

  async remove(id: number) {
    const product = await this.findOne(id);

    // محصولی که در سفارش‌های قبلی استفاده شده را نمی‌توان حذف کرد؛
    // چون order_items به آن ارجاع دارد و تاریخچه سفارش باید دست‌نخورده بماند.
    const orderItemCount = await this.orderItemRepository.count({
      where: { product: { id } },
    });
    if (orderItemCount > 0) {
      throw new BadRequestException(
        'این محصول در سفارش‌های قبلی استفاده شده و قابل حذف نیست',
      );
    }

    await this.productRepository.remove(product);
  }

  /**
   * ذخیره آدرس تصویر آپلودشده برای محصول و حذف فایل عکس قبلی از دیسک (در صورت وجود)
   */
  async setImage(id: number, imageUrl: string) {
    const product = await this.findOne(id);

    if (product.imageUrl?.startsWith('/uploads/')) {
      const oldFilePath = join(process.cwd(), product.imageUrl);
      fs.unlink(oldFilePath, () => {
        // اگر فایل قبلی وجود نداشت یا حذفش خطا داد، نادیده می‌گیریم
      });
    }

    product.imageUrl = imageUrl;
    await this.productRepository.save(product);
    return this.findOne(id);
  }

  /**
   * ثبت بازدید کاربر از یک محصول (برای سیستم پیشنهاد)
   * اتمیک: UPDATE ... viewCount = viewCount + 1 تا در درخواست‌های هم‌زمان
   * هیچ شمارشی گم نشود؛ اگر رکورد نبود INSERT (با رقابت امن ایندکس یونیک)
   */
  async trackView(userId: number, productId: number): Promise<void> {
    const updated = await this.productViewRepository
      .createQueryBuilder()
      .update(ProductView)
      .set({
        viewCount: () => 'viewCount + 1',
        lastViewedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('userId = :userId AND productId = :productId', {
        userId,
        productId,
      })
      .execute();

    if (!updated.affected) {
      try {
        await this.productViewRepository.insert({ userId, productId });
      } catch {
        // درخواست موازی همین الان رکورد را ساخته؛ نادیده گرفته می‌شود
      }
    }
  }
}
