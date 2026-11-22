import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.myOrders().then((d) => setOrders(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (orders.length === 0) {
    return <EmptyState icon={ShoppingBag} title="هنوز سفارشی ثبت نکرده‌اید" description="سفارش‌های شما اینجا نمایش داده می‌شود." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-ink-900">سفارش‌های من</h1>
      {orders.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`} className="card flex items-center justify-between p-4 hover:shadow-md">
          <div>
            <p className="font-medium text-ink-800">سفارش #{order.id}</p>
            <p className="mt-1 text-xs text-ink-500">{formatDateTime(order.createdAt)} · {order.items?.length || 0} قلم</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-brand-600">{formatPrice(order.finalPrice)}</span>
            <span className={`badge ${ORDER_STATUS_COLORS[order.status] || 'bg-ink-100 text-ink-600'}`}>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
