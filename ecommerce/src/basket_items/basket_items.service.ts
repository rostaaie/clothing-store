import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BasketDto } from './dto/basket.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { BasketItem } from './entities/basket_item.entity';
import { IsNull, Repository } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';

@Injectable()
export class BasketItemsService {
  constructor(
    @InjectRepository(BasketItem)
    private readonly basketRepository: Repository<BasketItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async addToBasket(userId: number, dto: BasketDto) {
    const { productId, quantity } = dto;
    let { variantId } = dto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: { variants: true },
    });
    if (!product) throw new NotFoundException('محصول یافت نشد');

    if (product.variants?.length) {
      if (!variantId) {
        throw new BadRequestException(
          'این محصول دارای سایز/رنگ است؛ لطفاً یکی را انتخاب کنید',
        );
      }
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new BadRequestException(
          'ترکیب سایز/رنگ انتخاب‌شده برای این محصول معتبر نیست',
        );
      }
    } else {
      // محصول ساده است، variantId (اگر اشتباهاً ارسال شده) نادیده گرفته می‌شود
      variantId = undefined;
    }

    const existing = await this.basketRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
        variant: variantId ? { id: variantId } : IsNull(),
      },
      relations: { variant: true },
    });

    if (existing) {
      existing.quantity += quantity;
      return await this.basketRepository.save(existing);
    }

    const newItem = this.basketRepository.create({
      user: { id: userId },
      product: { id: productId },
      variant: variantId ? { id: variantId } : null,
      quantity,
    });
    return await this.basketRepository.save(newItem);
  }

  async removeItem(userId: number, productId: number, variantId?: number) {
    const item = await this.basketRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
        variant: variantId ? { id: variantId } : IsNull(),
      },
    });
    if (!item) throw new NotFoundException('آیتم در سبد خرید یافت نشد');
    await this.basketRepository.remove(item);
    return { removed: true };
  }

  async getUserBasket(userId: number) {
    return await this.basketRepository.find({
      where: { user: { id: userId } },
      relations: { product: true, variant: true },
      order: { createdAt: 'DESC' },
    });
  }
}
