import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Wallet, ShoppingCart, ShoppingBag, Ticket as TicketIcon, Phone, ShieldCheck } from 'lucide-react';
import { usersApi, ticketApi } from '../../api/misc';
import { ordersApi } from '../../api/orders';
import { basketApi } from '../../api/basket';
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const ROLE_LABELS = { admin: 'ادمین', user: 'کاربر عادی' };

export default function AdminUserDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [basket, setBasket] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      usersApi.get(userId),
      ordersApi.adminList({ userId, limit: 50 }).catch(() => ({ data: [] })),
      basketApi.adminUserBasket(userId).catch(() => []),
      ticketApi.userTickets(userId).catch(() => []),
    ])
      .then(([u, ordersRes, basketRes, ticketsRes]) => {
        setUser(u);
        setOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);
        setBasket(Array.isArray(basketRes) ? basketRes : []);
        setTickets(Array.isArray(ticketsRes) ? ticketsRes : []);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (!user) return null;

  const basketTotal = basket.reduce((sum, it) => sum + (it.product?.price || 0) * (it.quantity || 1), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="btn-ghost h-9 w-9 p-0">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-xl font-bold text-ink-900">جزئیات کاربر #{user.id}</h1>
      </div>

      {/* اطلاعات کاربر */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="space-y-1.5 text-sm">
          <p className="text-base font-bold text-ink-900">{user.display_name}</p>
          <p className="flex items-center gap-1.5 text-ink-500" dir="ltr">
            <Phone size={14} /> {user.mobile}
          </p>
          <p className="flex items-center gap-1.5 text-ink-500">
            <ShieldCheck size={14} /> {ROLE_LABELS[user.role] || user.role}
          </p>
        </div>
        <Link to={`/admin/wallet/${user.id}`} className="btn-secondary text-sm">
          <Wallet size={15} /> مشاهده کیف پول
        </Link>
      </div>

      {/* سفارش‌ها */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-800">
          <ShoppingBag size={16} /> سفارش‌ها ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <EmptyState title="این کاربر هنوز سفارشی ثبت نکرده" />
        ) : (
          <div className="card divide-y divide-ink-100">
            {orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between p-4 text-sm hover:bg-ink-50">
                <span className="font-mono text-ink-700">#{o.id}</span>
                <span className="text-ink-600">{formatPrice(o.finalPrice)}</span>
                <span className={`badge ${ORDER_STATUS_COLORS[o.status] || 'bg-ink-100 text-ink-600'}`}>
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
                <span className="text-xs text-ink-400">{formatDateTime(o.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* سبد خرید فعلی (فقط نمایشی) */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-800">
          <ShoppingCart size={16} /> سبد خرید فعلی ({basket.length})
        </h2>
        <p className="mb-3 text-xs text-ink-400">این بخش فقط جهت مشاهده است؛ ادمین امکان ویرایش سبد خرید کاربر را ندارد.</p>
        {basket.length === 0 ? (
          <EmptyState title="سبد خرید این کاربر خالی است" />
        ) : (
          <div className="card divide-y divide-ink-100">
            {basket.map((it) => (
              <div key={it.id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-ink-700">{it.product?.title}</span>
                <span className="text-ink-500">× {it.quantity}</span>
                <span className="font-medium text-ink-800">{formatPrice((it.product?.price || 0) * it.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between p-4 text-sm font-bold">
              <span>جمع کل</span>
              <span className="text-brand-600">{formatPrice(basketTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* تیکت‌های پشتیبانی */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-800">
          <TicketIcon size={16} /> تیکت‌های پشتیبانی ({tickets.length})
        </h2>
        {tickets.length === 0 ? (
          <EmptyState title="این کاربر تیکتی ثبت نکرده" />
        ) : (
          <div className="card divide-y divide-ink-100">
            {tickets.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between p-4 text-sm hover:bg-ink-50">
                <div>
                  <p className="font-medium text-ink-800">{t.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{t.subject}</p>
                </div>
                <span className="text-xs text-ink-400">{formatDateTime(t.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
