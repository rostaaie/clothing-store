import { DataSource } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

/**
 * نقشه‌ی مسیر کامل دسته‌بندی (مثلاً «پوشاک مردانه>لباس>تیشرت») برای وصل کردن
 * محصولات و بوکمارک‌ها به دسته‌ها بدون وابستگی به id های شکننده.
 */
export async function buildCategoryPaths(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(Category);
  // درخت ۳ سطحی: ریشه › گروه › برگ
  const categories = await categoryRepository.find({
    relations: { parent: { parent: true } },
  });

  const pathCache = new Map<number, string>();
  const pathOf = (cat: Category): string => {
    const cached = pathCache.get(cat.id);
    if (cached) return cached;
    const path = cat.parent ? `${pathOf(cat.parent)}>${cat.title}` : cat.title;
    pathCache.set(cat.id, path);
    return path;
  };

  // گرم کردن کش با همه‌ی دسته‌بندی‌ها (والدها لود شده‌اند)
  categories.forEach((c) => pathOf(c));

  return {
    categories,
    pathOf,
    byPath: new Map(categories.map((c) => [pathOf(c), c])),
  };
}
