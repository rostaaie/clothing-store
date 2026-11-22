import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye } from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['PENDING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED'];

export default function AdminOrders() {
  const [result, setResult] = useState({ data: [], total: 0, page: 1, lastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [orderId, setOrderId] = useState('');

  const load = () => {
    setLoading(true);
    ordersApi
      .adminList({
        page,
        limit: 10,
        status: status || undefined,
        userId: userId || undefined,
        orderId: orderId || undefined,
      })
      .then((res) => setResult(res && typeof res === 'object' ? res : { data: [], total: 0, page: 1, lastPage: 1 }))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, status, userId, orderId]);

  const orders = Array.isArray(result.data) ? result.data : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink-900">مدیریت سفارش‌ها</h1>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">همه وضعیت‌ها</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s] || s}
            </option>
          ))}
        </select>
        <input
          className="input w-40"
          type="number"
          placeholder="فیلتر با آیدی کاربر..."
          value={userId}
          onChange={(e) => {
            setPage(1);
            setUserId(e.target.value);
          }}
        />
        <input
          className="input w-32"
          type="number"
          placeholder="شناسه سفارش..."
          value={orderId}
          onChange={(e) => {
            setPage(1);
            setOrderId(e.target.value);
          }}
        />
        <span className="mr-auto text-xs text-ink-400">{result.total} سفارش</span>
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="سفارشی یافت نشد" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-ink-500">
                <th className="p-3 font-medium">شناسه</th>
                <th className="p-3 font-medium">مشتری</th>
                <th className="p-3 font-medium">مبلغ نهایی</th>
                <th className="p-3 font-medium">وضعیت</th>
                <th className="p-3 font-medium">تاریخ</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                  <td className="p-3 font-mono text-ink-800">#{o.id}</td>
                  <td className="p-3 text-ink-600">
                    {o.user ? (
                      <>
                        {o.user.display_name} <span className="text-xs text-ink-400">(#{o.user.id})</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3 text-ink-600">{formatPrice(o.finalPrice)}</td>
                  <td className="p-3">
                    <span className={`badge ${ORDER_STATUS_COLORS[o.status] || 'bg-ink-100 text-ink-600'}`}>
                      {ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-ink-500">{formatDateTime(o.createdAt)}</td>
                  <td className="p-3">
                    <Link to={`/orders/${o.id}`} className="btn-ghost h-8 w-8 p-0">
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.lastPage > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary text-xs">
            صفحه قبل
          </button>
          <span className="flex items-center px-2 text-sm text-ink-500">
            صفحه {result.page} از {result.lastPage}
          </span>
          <button disabled={page >= result.lastPage} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs">
            صفحه بعد
          </button>
        </div>
      )}
    </div>
  );
}
