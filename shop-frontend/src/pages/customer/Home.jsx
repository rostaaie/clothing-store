import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles, TrendingUp, Heart } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { recommenderApi } from '../../api/misc';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/ProductCard';
import ImageOrPlaceholder from '../../components/ImageOrPlaceholder';
import Spinner from '../../components/Spinner';

export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [forMe, setForMe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([productsApi.list(), categoriesApi.list()]);
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
      } catch {
        /* silent */
      }
      try {
        const top = await recommenderApi.topSelling();
        setTopSelling(Array.isArray(top) ? top : []);
      } catch {
        /* recommender ممکن است دیتای کافی نداشته باشد */
      }
      setLoading(false);
    })();
  }, []);

  // جداگانه برای پیشنهاد شخصی — وابسته به user و مسیر (برای رفرش بعد از بازگشت)
  useEffect(() => {
    if (!user) { setForMe([]); return; }
    recommenderApi.forMe()
      .then((d) => setForMe(Array.isArray(d) ? d : []))
      .catch(() => setForMe([]));
  }, [user, location.key]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-l from-brand-500 to-brand-700 px-8 py-14 text-white">
        <div className="max-w-lg">
          <span className="badge bg-white/15 text-white">فروشگاه اینترنتی</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
            هر چیزی که نیاز دارید، اینجاست
          </h1>
          <p className="mt-3 text-brand-50">
            محصولات متنوع، ارسال سریع، پرداخت امن و پشتیبانی همیشگی — تجربه خرید آنلاین را از اینجا شروع کنید.
          </p>
          <Link to="/products" className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50">
            مشاهده محصولات
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink-900">دسته‌بندی‌ها</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${c.id}`}
                className="card flex min-w-[130px] flex-col items-center gap-2 px-5 py-4 text-center hover:shadow-md"
              >
                <span className="h-11 w-11 overflow-hidden rounded-full">
                  <ImageOrPlaceholder src={c.imageUrl} letter={c.title} letterClassName="text-lg" />
                </span>
                <span className="text-sm font-medium text-ink-700">{c.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {forMe.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Heart size={20} className="text-pink-500" />
            <h2 className="text-lg font-bold text-ink-900">پیشنهادهای ویژه شما</h2>
            <span className="badge bg-pink-50 text-pink-600">بر اساس علاقه‌مندی‌ها</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {forMe.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {topSelling.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-500" />
            <h2 className="text-lg font-bold text-ink-900">پرفروش‌ترین محصولات</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {topSelling.slice(0, 10).map((p) => (
              <ProductCard key={p.id ?? p.productId} product={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-brand-500" />
            <h2 className="text-lg font-bold text-ink-900">جدیدترین محصولات</h2>
          </div>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.slice(0, 10).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
