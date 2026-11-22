// ابزارهای کمکی برای کار با دسته‌بندی‌های چندلایه (والد/فرزند)

// آرایه فلت را بر اساس parentId گروه‌بندی می‌کند: { parentId: [children...] }
function groupByParent(categories) {
  const byParent = {};
  categories.forEach((c) => {
    const key = c.parentId || 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  return byParent;
}

/**
 * آیدی دسته‌بندی + آیدی همه فرزندان/نوه‌ها (در هر عمقی) را برمی‌گرداند.
 * برای این استفاده می‌شود که با انتخاب یک دسته‌بندی والد، محصولات همه زیردسته‌هایش هم نمایش داده شود.
 */
export function getDescendantIds(categories, categoryId) {
  const byParent = groupByParent(categories);
  const result = new Set([Number(categoryId)]);

  const collect = (id) => {
    const children = byParent[id] || [];
    for (const child of children) {
      if (!result.has(child.id)) {
        result.add(child.id);
        collect(child.id);
      }
    }
  };
  collect(Number(categoryId));
  return result;
}

/**
 * مسیر کامل یک دسته‌بندی را از ریشه تا خودش می‌سازد، مثل: "پوشاک زنانه > لباس"
 * برای رفع ابهام وقتی چند دسته‌بندی هم‌نام زیر والدهای مختلف وجود دارند استفاده می‌شود.
 */
export function getCategoryPath(categories, categoryId) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const path = [];
  let current = byId[categoryId];
  let guard = 0; // جلوگیری از حلقه بی‌نهایت در صورت داده خراب
  while (current && guard < 20) {
    path.unshift(current.title);
    current = current.parentId ? byId[current.parentId] : null;
    guard += 1;
  }
  return path.join(' > ');
}

/**
 * آرایه فلت دسته‌بندی‌ها را به یک درخت تودرتو (children در هر عمقی) تبدیل می‌کند.
 * خروجی هر گره، همان آبجکت دسته‌بندی به‌همراه فیلد children (آرایه‌ی فرزندان) است.
 * این تابع در نوار بالا (مگامنو)، صفحه دسته‌بندی‌ها و پنل ادمین به‌صورت مشترک استفاده می‌شود.
 */
export function buildCategoryTree(categories) {
  const byParent = groupByParent(categories);
  const attach = (list) => list.map((c) => ({ ...c, children: attach(byParent[c.id] || []) }));
  return attach(byParent.root || []);
}
