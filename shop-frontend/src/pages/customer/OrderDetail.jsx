import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, XCircle, RotateCcw, Wallet } from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { walletApi } from '../../api/wallet';
import { useAuth } from '../../context/AuthContext';
import { formatPrice, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [acting, setActing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // فقط صاحب سفارش (نه ادمین) می‌تواند سفارش را پرداخت کند
  const canPay = order?.status === 'PENDING' && !isAdmin && order?.user?.id === user?.id;

  // وقتی سفارش در انتظار پرداخت است، موجودی کیف پول را برای نمایش گزینه پرداخت می‌گیریم
  useEffect(() => {
    if (canPay) {
      setWalletLoading(true);
      walletApi
        .myWallet()
        .then(setWallet)
        .catch(() => setWallet(null))
        .finally(() => setWalletLoading(false));
    } else {
      setWallet(null);
      setWalletLoading(false);
    }
  }, [canPay]);

  const load = () => {
    setLoading(true);
    ordersApi
      .getOne(id)
      .then(setOrder)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handlePay = async () => {
    setPaying(true);
    try {
      // درخواست پرداخت به درگاه (در این پروژه درگاه شبیه‌سازی‌شده است)
      const payRes = await ordersApi.requestPayment(id);
      // چون درگاه واقعی وجود ندارد، نتیجه پرداخت را همان‌جا شبیه‌سازی و تایید می‌کنیم
      // (Authority صادرشده توسط درگاه را به verify می‌دهیم)
      const res = await ordersApi.verify(id, { Authority: payRes.authority });
      toast.success(res.message || 'پرداخت با موفقیت انجام شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const handlePayWithWallet = async () => {
    setPaying(true);
    try {
      const res = await ordersApi.payWithWallet(id);
      toast.success(res.message || 'پرداخت با کیف پول انجام شد');
      load();
      // موجودی کیف پول بعد از پرداخت به‌روز می‌شود
      walletApi
        .myWallet()
        .then(setWallet)
        .catch(() => setWallet(null));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const handleAdminAction = async (action) => {
    setActing(true);
    try {
      if (action === 'cancel') await ordersApi.cancel(id);
      if (action === 'refund') await ordersApi.refund(id, order?.user?.id);
      toast.success('عملیات با موفقیت انجام شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <Spinner />;
  if (!order) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">سفارش #{order.id}</h1>
        <span className={`badge ${ORDER_STATUS_COLORS[order.status] || 'bg-ink-100 text-ink-600'}`}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="card divide-y divide-ink-100 p-5">
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between py-3 text-sm first:pt-0 last:pb-0">
            <span className="text-ink-700">
              {item.product?.title}
              {(item.variantSize || item.variantColor) && (
                <span className="text-ink-400"> ({[item.variantSize, item.variantColor].filter(Boolean).join(' / ')})</span>
              )}
              {' '}× {item.quantity}
            </span>
            <span className="font-medium text-ink-900">{formatPrice(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="card space-y-2 p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-500">جمع کل</span>
          <span>{formatPrice(order.totalPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-500">تخفیف</span>
          <span className="text-green-600">- {formatPrice(order.discountAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold">
          <span>مبلغ نهایی</span>
          <span className="text-brand-600">{formatPrice(order.finalPrice)}</span>
        </div>
        <div className="flex justify-between pt-2 text-ink-500">
          <span>تاریخ ثبت</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>
        {order.paidAt && (
          <div className="flex justify-between text-ink-500">
            <span>تاریخ پرداخت</span>
            <span>{formatDateTime(order.paidAt)}</span>
          </div>
        )}
        {order.discountCode?.code && (
          <div className="flex justify-between text-ink-500">
            <span>کد تخفیف اعمال‌شده</span>
            <span dir="ltr">{order.discountCode.code}</span>
          </div>
        )}
      </div>

      {order.address && (
        <div className="card space-y-1 p-5 text-sm">
          <h2 className="mb-1 text-sm font-semibold text-ink-700">آدرس ارسال</h2>
          <p className="text-ink-700">{order.address.province}، {order.address.city}</p>
          <p className="text-ink-500">{order.address.adress}</p>
          <p className="text-xs text-ink-400" dir="ltr">
            کد پستی: {order.address.postal_code} — گیرنده: {order.address.reciver_mobile}
          </p>
        </div>
      )}

      {isAdmin && order.user && (
        <div className="card space-y-1 p-5 text-sm">
          <h2 className="mb-1 text-sm font-semibold text-ink-700">اطلاعات مشتری</h2>
          <p className="text-ink-700">{order.user.display_name} <span className="text-ink-400">(#{order.user.id})</span></p>
          <p className="text-ink-500" dir="ltr">{order.user.mobile}</p>
        </div>
      )}

      {canPay && (
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-ink-700">روش پرداخت</h2>

          <button onClick={handlePay} disabled={paying} className="btn-secondary w-full items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard size={17} />
              {paying ? 'در حال پرداخت...' : 'پرداخت با درگاه'}
            </span>
            <span className="text-xs font-normal text-ink-400">شبیه‌سازی‌شده</span>
          </button>

          <button
            onClick={handlePayWithWallet}
            disabled={paying || (wallet !== null && wallet.balance < order.finalPrice)}
            className="btn-primary w-full items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Wallet size={17} />
              {paying ? 'در حال پرداخت...' : 'پرداخت با کیف پول'}
            </span>
            <span className="text-xs font-normal opacity-80">
              {walletLoading ? 'در حال دریافت موجودی...' : wallet ? `موجودی: ${formatPrice(wallet.balance)}` : 'موجودی نامشخص'}
            </span>
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-ink-700">عملیات ادمین</h2>
          <div className="flex flex-wrap gap-2">
            {order.status === 'PENDING' && (
              <button disabled={acting} onClick={() => handleAdminAction('cancel')} className="btn-secondary text-red-600">
                <XCircle size={15} /> لغو سفارش
              </button>
            )}
            {order.status === 'PAID' && (
              <button disabled={acting} onClick={() => handleAdminAction('refund')} className="btn-secondary text-blue-600">
                <RotateCcw size={15} /> استرداد وجه
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
