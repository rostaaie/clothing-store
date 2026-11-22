import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, ShoppingCart, Minus, Plus, PackageX } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { bookmarksApi } from '../../api/bookmarks';
import { recommenderApi } from '../../api/misc';
import { useBasket } from '../../context/BasketContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import { getCategoryPath } from '../../utils/categoryTree';
import { getErrorMessage } from '../../api/client';
import ProductCard from '../../components/ProductCard';
import ImageOrPlaceholder from '../../components/ImageOrPlaceholder';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useBasket();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [boughtTogether, setBoughtTogether] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [bookmarked, setBookmarked] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    setLoading(true);
    productsApi
      .get(id)
      .then(setProduct)
      .catch(() => toast.error('محصول یافت نشد'))
      .finally(() => setLoading(false));
    // فهرست کامل دسته‌بندی‌ها برای ساخت مسیر کامل (مثل «پوشاک زنانه > کفش > کفش مجلسی»)
    // چون product.categories فقط شامل خودِ دسته‌های اختصاص‌یافته است، نه زنجیره‌ی والدهایشان
    categoriesApi.list().then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
    recommenderApi.similar(id).then((d) => setSimilar(Array.isArray(d) ? d : [])).catch(() => {});
    recommenderApi.boughtTogether(id).then((d) => setBoughtTogether(Array.isArray(d) ? d : [])).catch(() => {});
    if (user) {
      bookmarksApi
        .list()
        .then((list) => setBookmarked(Array.isArray(list) && list.some((b) => b.product?.id === Number(id))))
        .catch(() => {});
    }
    setQty(1);
    setSelectedSize('');
    setSelectedColor('');
  }, [id, user]);

  // محورهای موجود سایز/رنگ محصول (اگر محصول variant نداشته باشد هر دو آرایه خالی می‌مانند)
  const sizes = useMemo(
    () => [...new Set((product?.variants || []).map((v) => v.size).filter(Boolean))],
    [product],
  );
  const colors = useMemo(
    () => [...new Set((product?.variants || []).map((v) => v.color).filter(Boolean))],
    [product],
  );
  const hasVariants = Boolean(product?.variants?.length);
  const matchedVariant = hasVariants
    ? product.variants.find((v) => (v.size || '') === selectedSize && (v.color || '') === selectedColor)
    : null;
  const variantSelectionComplete = !hasVariants || (sizes.length === 0 || selectedSize) && (colors.length === 0 || selectedColor);

  const toggleBookmark = async () => {
    if (!user) {
      toast.error('برای نشانه‌گذاری ابتدا وارد شوید');
      return;
    }
    try {
      if (bookmarked) {
        await bookmarksApi.remove(id);
        setBookmarked(false);
        toast.success('از نشانه‌شده‌ها حذف شد');
      } else {
        await bookmarksApi.add(Number(id));
        setBookmarked(true);
        toast.success('نشانه‌گذاری شد');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;
  if (!product) return null;

  const available = hasVariants
    ? (matchedVariant ? matchedVariant.stock - matchedVariant.reservedStock : 0)
    : (product.stock ?? 0) - (product.reservedStock ?? 0);
  const invalidCombo = hasVariants && variantSelectionComplete && !matchedVariant;
  const outOfStock = hasVariants ? (variantSelectionComplete ? available <= 0 : false) : available <= 0;

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl">
          <ImageOrPlaceholder src={product.imageUrl} letter={product.title} letterClassName="text-7xl" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {product.categories?.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`} className="badge bg-ink-100 text-ink-600 hover:bg-ink-200">
                {getCategoryPath(categories, c.id) || c.title}
              </Link>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-ink-900">{product.title}</h1>
          <p className="leading-relaxed text-ink-600">{product.description}</p>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-brand-600">{formatPrice(product.price)}</span>
            {hasVariants && !variantSelectionComplete ? (
              <span className="badge bg-ink-100 text-ink-500">ابتدا سایز/رنگ را انتخاب کنید</span>
            ) : invalidCombo || outOfStock ? (
              <span className="badge bg-ink-800 text-white">
                <PackageX size={13} className="ml-1" /> ناموجود
              </span>
            ) : (
              <span className="badge bg-green-100 text-green-700">موجود ({available} عدد)</span>
            )}
          </div>

          {sizes.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-700">سایز</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedSize === size ? 'border-brand-500 bg-brand-50 font-semibold text-brand-600' : 'border-ink-200 text-ink-600 hover:border-brand-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-700">رنگ</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const swatch = product.variants.find((v) => v.color === color)?.colorCode;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        selectedColor === color ? 'border-brand-500 bg-brand-50 font-semibold text-brand-600' : 'border-ink-200 text-ink-600 hover:border-brand-300'
                      }`}
                    >
                      {swatch && <span className="h-3.5 w-3.5 rounded-full border border-ink-200" style={{ backgroundColor: swatch }} />}
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!outOfStock && !invalidCombo && variantSelectionComplete && (
            <div className="flex items-center gap-1 rounded-xl border border-ink-200 p-1 w-fit">
              <button onClick={() => setQty((q) => Math.min(available, q + 1))} className="btn-ghost h-8 w-8 p-0">
                <Plus size={15} />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="btn-ghost h-8 w-8 p-0">
                <Minus size={15} />
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              disabled={outOfStock || invalidCombo || !variantSelectionComplete}
              onClick={async () => {
                try {
                  await addItem(product.id, qty, matchedVariant?.id);
                } catch {
                  /* handled in context */
                }
              }}
              className="btn-primary flex-1"
            >
              <ShoppingCart size={17} />
              {hasVariants && !variantSelectionComplete ? 'ابتدا سایز/رنگ را انتخاب کنید' : 'افزودن به سبد خرید'}
            </button>
            <button onClick={toggleBookmark} className={`btn-secondary ${bookmarked ? 'border-brand-400 text-brand-600' : ''}`}>
              <Heart size={17} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink-900">محصولات مشابه</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {boughtTogether.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink-900">اغلب با این محصول خریداری می‌شود</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {boughtTogether.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
