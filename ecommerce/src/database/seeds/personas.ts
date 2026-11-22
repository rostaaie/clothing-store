import { Category } from '../../categories/entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

/**
 * شخصیت‌های خریدار برای Seed
 *
 * اگر همه‌ی کاربران Seed ذوق یکسان یا کاملاً تصادفی داشته باشند، سیستم پیشنهاددهنده
 * چیزی برای یادگرفتن ندارد و ارزیابی‌اش بی‌معنی می‌شود. هر شخصیت مجموعه‌ای از
 * بخش‌های کاتالوگ (بر اساس مسیر دسته‌بندی) است و رفتار کاربر (خرید، بوکمارک،
 * بازدید) بیشتر از همان بخش‌ها می‌آید و کمی هم «نویز» دارد (مثل رفتار واقعی).
 */
// ── تکرارپذیری: با `SEED=42 npm run seed` همیشه همان داده‌ی آزمایشی ساخته می‌شود ──
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedEnv = process.env.SEED;
/** شبه‌تصادفی: اگر SEED تنظیم شده باشد ثابت‌دانه، وگرنه Math.random */
export const rand: () => number =
  seedEnv !== undefined && seedEnv !== '' && !Number.isNaN(Number(seedEnv))
    ? mulberry32(Number(seedEnv))
    : Math.random;

export interface Persona {
  name: string;
  /** هر محصولی که مسیر دسته‌اش شامل یکی از این رشته‌ها باشد جزو علاقه‌ی این شخصیت است */
  matches: string[];
}

export const PERSONAS: Persona[] = [
  {
    name: 'مرد ورزشی',
    matches: ['پوشاک مردانه>ورزشی', 'پوشاک مردانه>کفش'],
  },
  {
    name: 'مرد رسمی',
    matches: [
      'پوشاک مردانه>لباس>کت و ست رسمی',
      'پوشاک مردانه>لباس>پیراهن',
      'پوشاک مردانه>لباس>شلوار',
      'پوشاک مردانه>اکسسوری',
      'پوشاک مردانه>کیف',
    ],
  },
  {
    name: 'زن روزمره',
    matches: ['پوشاک زنانه>لباس', 'پوشاک زنانه>ورزشی'],
  },
  {
    name: 'زن کیف و اکسسوری',
    matches: [
      'پوشاک زنانه>کیف',
      'پوشاک زنانه>اکسسوری',
      'پوشاک زنانه>لباس>دامن',
      'پوشاک زنانه>لباس>پیراهن و لباس مجلسی',
    ],
  },
];

/** شخصیت هر کاربر؛ قطعی (بر اساس id) تا همه‌ی Seederها یک شخصیت ببینند */
export const personaOf = (user: User): Persona =>
  PERSONAS[user.id % PERSONAS.length];

/** محصولات مرتبط با یک شخصیت */
export const personaPool = (
  products: Product[],
  pathOf: (c: Category) => string,
  persona: Persona,
): Product[] =>
  products.filter((p) =>
    p.categories?.some((c) =>
      persona.matches.some((m) => pathOf(c).includes(m)),
    ),
  );

/**
 * انتخاب count محصول متمایز: هر کدام با احتمال noiseRate از کل کاتالوگ
 * (رفتار پرت/کنجکاوی) و در غیر این صورت از محصولات شخصیت.
 */
export function pickMixed<T>(
  pool: T[],
  all: T[],
  count: number,
  noiseRate: number,
): T[] {
  const picked = new Set<T>();
  const max = Math.min(count, all.length);
  let guard = 0;
  while (picked.size < max && guard++ < 200) {
    const source = pool.length && rand() >= noiseRate ? pool : all;
    picked.add(source[Math.floor(rand() * source.length)]);
  }
  return [...picked];
}

/** تاریخی تصادفی در maxDays روز گذشته (برای وزن‌دهی زمانی واقع‌گرایانه) */
export const randomPastDate = (maxDays: number): Date =>
  new Date(Date.now() - rand() * maxDays * 86_400_000);
