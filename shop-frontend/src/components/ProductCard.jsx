import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, PackageX } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { useBasket } from '../context/BasketContext';
import ImageOrPlaceholder from './ImageOrPlaceholder';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { addItem } = useBasket();
  const available = (product.stock ?? 0) - (product.reservedStock ?? 0);
  const outOfStock = available <= 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product.id, 1);
    } catch {
      /* پیام خطا در context نمایش داده می‌شود */
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden">
        <ImageOrPlaceholder src={product.imageUrl} letter={product.title} letterClassName="text-4xl" />
        {outOfStock && (
          <span className="badge absolute right-2 top-2 bg-ink-800 text-white">
            <PackageX size={12} className="ml-1" /> ناموجود
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1">
          {product.categories?.slice(0, 2).map((c) => (
            <span key={c.id} className="badge bg-ink-100 text-ink-600">
              {c.title}
            </span>
          ))}
        </div>
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold text-ink-800">{product.title}</h3>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-brand-600">{formatPrice(product.price)}</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="btn-primary mt-1 w-full text-xs"
        >
          <ShoppingCart size={15} />
          افزودن به سبد خرید
        </button>
      </div>
    </Link>
  );
}
