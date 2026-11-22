import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Tags } from 'lucide-react';
import { categoriesApi } from '../../api/categories';
import ImageOrPlaceholder from '../../components/ImageOrPlaceholder';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';

/**
 * صفحه‌ی دسته‌بندی‌ها: به‌جای نمایش کل درخت به‌صورت خطی (که فضای خیلی زیادی خالی می‌ماند)،
 * هر بار فقط یک سطح از درخت را به‌صورت گرید نشان می‌دهد:
 * - /categories            → دسته‌های ریشه (پوشاک زنانه، پوشاک مردانه، ...)
 * - /categories/:id        → عنوان همان دسته در بالا + زیردسته‌های مستقیمش به‌صورت گرید
 * کلیک روی هر کارت: اگر خودش زیردسته دارد → می‌رویم یک سطح پایین‌تر (همین صفحه با id جدید)
 * اگر برگ درخت است (بدون زیردسته) → مستقیم به فهرست محصولات همان دسته می‌رویم.
 */
export default function Categories() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoriesApi
      .list()
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const currentId = id ? Number(id) : null;
  const current = currentId ? byId[currentId] : null;

  const children = useMemo(
    () => categories.filter((c) => (c.parentId || null) === currentId),
    [categories, currentId],
  );

  const hasChildren = (catId) => categories.some((c) => c.parentId === catId);

  // مسیر نان‌ریزه از ریشه تا دسته‌ی جاری، برای این‌که کاربر بداند کجای درخت است
  const breadcrumb = useMemo(() => {
    const path = [];
    let node = current;
    let guard = 0;
    while (node && guard < 20) {
      path.unshift(node);
      node = node.parentId ? byId[node.parentId] : null;
      guard += 1;
    }
    return path;
  }, [current, byId]);

  const handleSelect = (child) => {
    if (hasChildren(child.id)) {
      navigate(`/categories/${child.id}`);
    } else {
      navigate(`/products?category=${child.id}`);
    }
  };

  if (loading) return <Spinner />;

  if (currentId && !current) {
    return <EmptyState icon={Tags} title="دسته‌بندی یافت نشد" description="این دسته‌بندی وجود ندارد یا حذف شده است." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        <Link to="/categories" className="hover:text-brand-600">
          دسته‌بندی‌ها
        </Link>
        {breadcrumb.map((node) => (
          <span key={node.id} className="flex items-center gap-1.5">
            <ChevronLeft size={13} className="text-ink-300" />
            <Link to={`/categories/${node.id}`} className="hover:text-brand-600">
              {node.title}
            </Link>
          </span>
        ))}
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink-900">{current ? current.title : 'دسته‌بندی‌ها'}</h1>
        {current && (
          <Link to={`/products?category=${current.id}`} className="mt-1 inline-block text-sm text-brand-600 hover:underline">
            مشاهده همه محصولات {current.title}
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState icon={Tags} title="زیردسته‌ای یافت نشد" description="این دسته‌بندی زیرشاخه‌ای ندارد." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => handleSelect(child)}
              className="card flex flex-col items-center gap-3 px-5 py-8 text-center hover:shadow-md"
            >
              <div className="h-14 w-14 overflow-hidden rounded-full">
                <ImageOrPlaceholder src={child.imageUrl} letter={child.title} letterClassName="text-2xl" />
              </div>
              <span className="font-medium text-ink-800">{child.title}</span>
              {hasChildren(child.id) && <span className="text-xs text-ink-400">مشاهده زیرشاخه‌ها ←</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
