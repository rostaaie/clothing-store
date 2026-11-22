import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useBasket } from '../../context/BasketContext';
import { formatPrice } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

export default function Basket() {
  const { items, loading, removeItem } = useBasket();
  const navigate = useNavigate();

  const total = items.reduce((sum, it) => sum + (it.product?.price || 0) * (it.quantity || 1), 0);

  const handleRemove = async (productId, variantId) => {
    try {
      await removeItem(productId, variantId);
      toast.success('محصول از سبد حذف شد');
    } catch {
      toast.error('حذف محصول با خطا مواجه شد');
    }
  };

  if (loading) return <Spinner />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="سبد خرید شما خالی است"
        description="محصولی به سبد خرید اضافه نکرده‌اید."
        action={
          <Link to="/products" className="btn-primary mt-2">
            مشاهده محصولات
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-3">
        <h1 className="mb-2 text-xl font-bold text-ink-900">سبد خرید</h1>
        {items.map((item) => (
          <div key={item.id} className="card flex items-center gap-4 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-ink-50 text-xl font-bold text-brand-300">
              {item.product?.title?.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/products/${item.product?.id}`} className="line-clamp-1 font-medium text-ink-800 hover:text-brand-600">
                {item.product?.title}
              </Link>
              {(item.variant?.size || item.variant?.color) && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                  {item.variant?.size && <span className="badge bg-ink-100 text-ink-600">سایز {item.variant.size}</span>}
                  {item.variant?.color && (
                    <span className="badge flex items-center gap-1 bg-ink-100 text-ink-600">
                      {item.variant.colorCode && (
                        <span className="h-2.5 w-2.5 rounded-full border border-ink-200" style={{ backgroundColor: item.variant.colorCode }} />
                      )}
                      {item.variant.color}
                    </span>
                  )}
                </p>
              )}
              <p className="mt-1 text-sm text-ink-500">
                {formatPrice(item.product?.price)} × {item.quantity}
              </p>
            </div>
            <div className="text-left">
              <p className="font-bold text-brand-600">{formatPrice((item.product?.price || 0) * (item.quantity || 1))}</p>
            </div>
            <button onClick={() => handleRemove(item.product?.id, item.variant?.id)} className="btn-ghost text-red-500 hover:bg-red-50">
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>

      <div className="card w-full space-y-4 p-5 lg:w-80">
        <h2 className="font-bold text-ink-900">خلاصه سفارش</h2>
        <div className="flex justify-between text-sm text-ink-600">
          <span>جمع کل</span>
          <span className="font-semibold text-ink-900">{formatPrice(total)}</span>
        </div>
        <button onClick={() => navigate('/checkout')} className="btn-primary w-full">
          ادامه فرآیند خرید
          <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );
}
