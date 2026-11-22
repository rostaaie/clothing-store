import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, PackageSearch } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { getDescendantIds, getCategoryPath } from '../../utils/categoryTree';
import ProductCard from '../../components/ProductCard';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  // جستجوی URL (مثلا از باکس جستجوی هدر): /products?search=...
  const urlSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(urlSearch);
  const [searchFocused, setSearchFocused] = useState(false);

  // وقتی پارامتر search در URL عوض می‌شود (جستجوی جدید از هدر)، مقدار محلی هم همگام می‌شود.
  // اگر کاربر در حال تایپ در باکس صفحه باشد، دست به مقدارش نمی‌زنیم (تا فاصله‌ها از بین نرود).
  useEffect(() => {
    if (!searchFocused) setSearch(urlSearch);
  }, [urlSearch, searchFocused]);

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    // جستجوی صفحه هم در URL ثبت می‌شود تا با جستجوی هدر یکسان و قابل اشتراک باشد
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (v.trim()) sp.set('search', v.trim());
        else sp.delete('search');
        return sp;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, c] = await Promise.all([productsApi.list(), categoriesApi.list()]);
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
      } catch {
        /* silent */
      }
      setLoading(false);
    })();
  }, []);

  // آیدی دسته‌بندی انتخاب‌شده + همه زیردسته‌هایش (تا هر عمقی)
  // تا با کلیک روی یک دسته‌بندی والد، محصولات زیردسته‌هایش هم دیده شوند
  const matchIds = useMemo(() => {
    if (!activeCategory || categories.length === 0) return null;
    return getDescendantIds(categories, activeCategory);
  }, [activeCategory, categories]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !matchIds || p.categories?.some((c) => matchIds.has(c.id));
      return matchesSearch && matchesCategory;
    });
  }, [products, search, matchIds]);

  const setCategory = (id) => {
    if (!id) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', id);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-ink-900">محصولات</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pr-9"
            placeholder="جستجوی محصول..."
            value={search}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`badge cursor-pointer ${!activeCategory ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
        >
          همه
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(String(c.id))}
            title={getCategoryPath(categories, c.id)}
            className={`badge cursor-pointer ${activeCategory === String(c.id) ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
          >
            {c.parentId ? getCategoryPath(categories, c.id) : c.title}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={PackageSearch} title="محصولی یافت نشد" description="عبارت جستجو یا فیلتر دسته‌بندی را تغییر دهید." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
