import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}
  async create(createCategoryDto: CreateCategoryDto) {
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('دسته‌بندی والد یافت نشد');
      }
    }
    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll() {
    return await this.categoryRepository.find({
      relations: { products: true, parent: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: { products: true, parent: true, children: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.title !== undefined)
      category.title = updateCategoryDto.title;
    if (updateCategoryDto.imageUrl !== undefined)
      category.imageUrl = updateCategoryDto.imageUrl;

    if (updateCategoryDto.parentId !== undefined) {
      const newParentId = updateCategoryDto.parentId;

      if (newParentId === id) {
        throw new BadRequestException('یک دسته‌بندی نمی‌تواند والد خودش باشد');
      }

      if (newParentId !== null) {
        const parent = await this.categoryRepository.findOne({
          where: { id: newParentId },
        });
        if (!parent) {
          throw new NotFoundException('دسته‌بندی والد یافت نشد');
        }
        // جلوگیری از ایجاد حلقه: نباید یکی از فرزندان/نوه‌های همین دسته‌بندی، والد جدیدش شود
        if (await this.isDescendant(id, newParentId)) {
          throw new BadRequestException(
            'نمی‌توانید یکی از زیردسته‌های این دسته‌بندی را والد آن قرار دهید',
          );
        }
      }

      category.parentId = newParentId;
    }

    return await this.categoryRepository.save(category);
  }

  /**
   * آیا candidateId در میان فرزندان (در هر عمقی) categoryId قرار دارد؟
   * برای جلوگیری از ایجاد حلقه در درخت دسته‌بندی‌ها استفاده می‌شود.
   */
  private async isDescendant(
    categoryId: number,
    candidateId: number,
  ): Promise<boolean> {
    const children = await this.categoryRepository.find({
      where: { parentId: categoryId },
    });
    for (const child of children) {
      if (child.id === candidateId) return true;
      if (await this.isDescendant(child.id, candidateId)) return true;
    }
    return false;
  }

  /**
   * ذخیره آدرس تصویر آپلودشده برای دسته‌بندی و حذف فایل عکس قبلی از دیسک (در صورت وجود)
   */
  async setImage(id: number, imageUrl: string) {
    const category = await this.findOne(id);

    if (category.imageUrl?.startsWith('/uploads/')) {
      const oldFilePath = join(process.cwd(), category.imageUrl);
      fs.unlink(oldFilePath, () => {
        // اگر فایل قبلی وجود نداشت یا حذفش خطا داد، نادیده می‌گیریم
      });
    }

    category.imageUrl = imageUrl;
    return await this.categoryRepository.save(category);
  }

  async removeOnlyCategory(id: number) {
    const category = await this.findOne(id);

    category.products = []; //پاک کردن رابطه پروداکت و کتگوری و فیلد جدول واسط

    await this.categoryRepository.save(category);

    await this.categoryRepository.remove(category);

    return `Category #${id} removed`;
  }

  /*
  async removeOnlyCategory(id: number) {
  return this.dataSource.transaction(async manager => {
    const category = await manager.findOne(Category, {
      where: { id }
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    await manager
      .createQueryBuilder()
      .relation(Category, 'products')
      .of(category)
      .remove();

    await manager.remove(Category, category);

    return `Category #${id} removed`;
  });
}

 */
}
