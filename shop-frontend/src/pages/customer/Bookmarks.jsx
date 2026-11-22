import { useEffect, useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { bookmarksApi } from '../../api/bookmarks';
import { formatPrice } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import ImageOrPlaceholder from '../../components/ImageOrPlaceholder';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const load = () => {
    setLoading(true);
    bookmarksApi
      .list()
      .then((data) => setBookmarks(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    try {
      await bookmarksApi.remove(productId);
      setBookmarks((list) => list.filter((b) => b.product?.id !== productId));
      toast.success('از نشانه‌شده‌ها حذف شد');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <Spinner />;

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="نشانه‌ای ثبت نکرده‌اید"
        description="با زدن آیکون قلب روی صفحه هر محصول، آن را اینجا نشانه‌گذاری کنید."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink-900">محصولات نشانه‌شده</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {bookmarks.map((b) => {
          const p = b.product;
          if (!p) return null;
          return (
            <div key={b.id} className="card group relative flex flex-col overflow-hidden">
              <button
                onClick={() => handleRemove(p.id)}
                disabled={removingId === p.id}
                className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm hover:bg-red-50"
                title="حذف از نشانه‌شده‌ها"
              >
                <Trash2 size={15} />
              </button>
              <Link to={`/products/${p.id}`} className="flex flex-col">
                <div className="aspect-square overflow-hidden">
                  <ImageOrPlaceholder src={p.imageUrl} letter={p.title} letterClassName="text-4xl" />
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-ink-800">{p.title}</h3>
                  <span className="text-base font-bold text-brand-600">{formatPrice(p.price)}</span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
