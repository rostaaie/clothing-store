import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Category } from '../../categories/entities/category.entity';

/**
 * درخت دسته‌بندی فروشگاه پوشاک — دقیقاً مطابق ساختار درخواستی:
 * پوشاک مردانه و پوشاک زنانه با زیرشاخه‌های لباس / کیف / کفش / اکسسوری / ورزشی.
 * خطوطی که چند نام با ویرگول دارند (مثل «پالتو، بارانی، کاپشن») طبق تصمیم
 * کاربر به‌عنوان یک دسته‌بندی واحد ساخته می‌شوند.
 */
type CategorySeed = { title: string; children?: CategorySeed[] };

const MEN: CategorySeed = {
  title: 'پوشاک مردانه',
  children: [
    {
      title: 'لباس',
      children: [
        { title: 'تیشرت' },
        { title: 'پلوشرت' },
        { title: 'پیراهن' },
        { title: 'شلوار' },
        { title: 'جین' },
        { title: 'شلوارک' },
        { title: 'کت و ست رسمی' },
        { title: 'لباس زیر' },
        { title: 'لباس راحتی' },
        { title: 'جوراب' },
        { title: 'تاپ و رکابی' },
        { title: 'ژاکت و پلیور' },
        { title: 'پالتو، بارانی، کاپشن' },
      ],
    },
    {
      title: 'کیف',
      children: [
        { title: 'کیف' },
        { title: 'کیف پول' },
        { title: 'کوله پشتی' },
        { title: 'کیف سفری و چمدان مردانه' },
      ],
    },
    {
      title: 'کفش',
      children: [
        { title: 'روزمره' },
        { title: 'کالج' },
        { title: 'رسمی' },
        { title: 'صندل' },
        { title: 'نیم بوت' },
        { title: 'لوازم جانبی' },
      ],
    },
    {
      title: 'اکسسوری',
      children: [
        { title: 'عینک' },
        { title: 'ساعت مردانه' },
        { title: 'کمربند' },
        { title: 'ست هدیه' },
      ],
    },
    {
      title: 'ورزشی',
      children: [
        { title: 'تیشرت و پلوشرت ورزشی' },
        { title: 'شلوار ورزشی' },
        { title: 'شلوارک ورزشی' },
        { title: 'کفش ورزشی' },
        { title: 'گرمکن و ست ورزشی' },
        { title: 'لباس شنا' },
        { title: 'کاپشن و جلیقه ورزشی' },
        { title: 'سویشرت و هودی ورزشی' },
      ],
    },
  ],
};

const WOMEN: CategorySeed = {
  title: 'پوشاک زنانه',
  children: [
    {
      title: 'لباس',
      children: [
        { title: 'تاپ و نیم تنه' },
        { title: 'تیشرت' },
        { title: 'پولوشرت' },
        { title: 'شومیز و بلوز' },
        { title: 'سرهمی' },
        { title: 'شلوار جین زنانه' },
        { title: 'کت، جلیقه و ست رسمی زنانه' },
        { title: 'پیراهن و لباس مجلسی' },
        { title: 'دامن' },
        { title: 'تونیک' },
        { title: 'لباس زیر' },
        { title: 'لباس راحتی و خواب' },
        { title: 'جوراب و جوراب شلواری' },
        { title: 'لباس بارداری' },
        { title: 'کاپشن، پالتو، بارانی' },
        { title: 'ژاکت و پلیور' },
        { title: 'شلوار' },
      ],
    },
    {
      title: 'کیف',
      children: [
        { title: 'کیف' },
        { title: 'کوله پشتی' },
        { title: 'ساک و چمدان' },
        { title: 'کیف پول و آرایش' },
      ],
    },
    {
      title: 'کفش',
      children: [
        { title: 'روزمره' },
        { title: 'صندل' },
        { title: 'کالج' },
        { title: 'کفش تخت' },
        { title: 'پاشنه دار' },
        { title: 'نیم بوت' },
        { title: 'بوت' },
      ],
    },
    {
      title: 'اکسسوری',
      children: [
        { title: 'عینک' },
        { title: 'کمربند' },
        { title: 'زیورآلات زنانه' },
        { title: 'ساعت زنانه' },
        { title: 'ست هدیه' },
      ],
    },
    {
      title: 'ورزشی',
      children: [
        { title: 'تیشرت و پلوشرت ورزشی' },
        { title: 'تاپ و نیم تنه ورزشی' },
        { title: 'شلوار و سرهمی ورزشی' },
        { title: 'لگینگ ورزشی' },
        { title: 'شلوارک ورزشی' },
        { title: 'کفش ورزشی' },
        { title: 'گرمکن و ست ورزشی' },
        { title: 'لباس شنا' },
        { title: 'کاپشن و جلیقه ورزشی' },
        { title: 'سویشرت و هودی ورزشی' },
      ],
    },
  ],
};

export default class CategorySeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const categoryRepository = dataSource.getRepository(Category);

    const saveNode = async (
      node: CategorySeed,
      parentId: number | null,
    ): Promise<void> => {
      const saved = await categoryRepository.save(
        categoryRepository.create({ title: node.title, parentId }),
      );
      for (const child of node.children ?? []) {
        await saveNode(child, saved.id);
      }
    };

    for (const root of [MEN, WOMEN]) {
      await saveNode(root, null);
    }

    const total = await categoryRepository.count();
    console.log(
      `✅ درخت دسته‌بندی پوشاک مردانه/زنانه ایجاد شد (${total} دسته)`,
    );
  }
}
