import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountCode } from './entities/discount_code.entity';
import { CreateDiscountCodeDto } from './dto/create-discount_code.dto';
import { UpdateDiscountCodeDto } from './dto/update-discount_code.dto';

@Injectable()
export class DiscountCodeService {
  constructor(
    @InjectRepository(DiscountCode)
    private readonly discountRepo: Repository<DiscountCode>,
  ) {}

  async create(dto: CreateDiscountCodeDto): Promise<DiscountCode> {
    const exist = await this.discountRepo.findOne({
      where: { code: dto.code },
    });

    if (exist) {
      throw new BadRequestException('کد تخفیف تکراری است');
    }

    const discount = this.discountRepo.create(dto);
    return this.discountRepo.save(discount);
  }

  async findAll(): Promise<DiscountCode[]> {
    return this.discountRepo.find();
  }

  async findOne(id: number): Promise<DiscountCode> {
    const code = await this.discountRepo.findOne({ where: { id } });

    if (!code) throw new NotFoundException('کد تخفیف پیدا نشد');

    return code;
  }

  async update(id: number, dto: UpdateDiscountCodeDto): Promise<DiscountCode> {
    const discount = await this.findOne(id);

    Object.assign(discount, dto);

    return this.discountRepo.save(discount);
  }

  async remove(id: number): Promise<void> {
    const discount = await this.findOne(id);
    await this.discountRepo.remove(discount);
  }

  // SECTION: Used inside OrdersService
  async validateDiscount(code: string) {
    const discount = await this.discountRepo.findOne({
      where: { code },
    });

    if (!discount) return null;

    if (discount.maxUsage > 0 && discount.usageCount >= discount.maxUsage) {
      return null;
    }

    if (discount.expireAt && new Date() > discount.expireAt) {
      return null;
    }

    return discount;
  }

  async increaseUsage(discountId: number) {
    await this.discountRepo.increment({ id: discountId }, 'usageCount', 1);
  }
}
