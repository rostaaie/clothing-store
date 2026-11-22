import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Tag, MapPin, Plus, ShoppingCart, CreditCard, Wallet } from 'lucide-react';
import { useBasket } from '../../context/BasketContext';
import { ordersApi } from '../../api/orders';
import { addressApi } from '../../api/address';
import { walletApi } from '../../api/wallet';
import { formatPrice } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { items, refresh } = useBasket();
  const navigate = useNavigate();
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('GATEWAY');
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  useEffect(() => {
    addressApi
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAddresses(list);
        if (list.length > 0) setSelectedAddressId(list[0].id);
      })
      .finally(() => setAddressesLoading(false));
  }, []);

  // موجودی کیف پول برای نمایش گزینه «پرداخت با کیف پول»
  useEffect(() => {
    walletApi
      .myWallet()
      .then(setWallet)
      .catch(() => setWallet(null))
      .finally(() => setWalletLoading(false));
  }, []);

  const total = items.reduce((sum, it) => sum + (it.product?.price || 0) * (it.quantity || 1), 0);

  const walletBalance = Number(wallet?.balance) || 0;
  const walletInsufficient = paymentMethod === 'WALLET' && wallet !== null && walletBalance < total;

  const handleCreateOrder = async () => {
    if (!selectedAddressId) {
      toast.error('برای ثبت سفارش ابتدا یک آدرس انتخاب کنید');
      return;
    }
    setLoading(true);
    try {
      // اگر موجودی کیف پول کافی نباشد، بک‌اند با پیام مناسب خطا می‌دهد و هیچ سفارشی ساخته نمی‌شود
      const result = await ordersApi.create(selectedAddressId, discountCode.trim(), paymentMethod);

      if (paymentMethod === 'WALLET') {
        // پرداخت با کیف پول همان لحظه انجام شده و سفارش PAID است
        toast.success(result.message || 'سفارش ثبت و با کیف پول پرداخت شد');
        await refresh();
        navigate(`/orders/${result.orderId}`);
        return;
      }

      // درگاه در این پروژه شبیه‌سازی‌شده است؛ پرداخت همان لحظه انجام و تایید می‌شود
      try {
        const payRes = await ordersApi.requestPayment(result.orderId);
        // Authority صادرشده توسط درگاه را به verify می‌دهیم (درگاه واقعی آن را در callback برمی‌گرداند)
        await ordersApi.verify(result.orderId, { Authority: payRes.authority });
        toast.success('پرداخت با موفقیت انجام شد');
      } catch {
        // اگر پرداخت لحظه‌ای موفق نشد، کاربر از صفحه سفارش می‌تواند دوباره پرداخت کند
        toast.error('پرداخت در لحظه انجام نشد؛ از صفحه سفارش دوباره تلاش کنید');
      }
      await refresh();
      navigate(`/orders/${result.orderId}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="سبد خرید شما خالی است"
        description="برای ثبت سفارش ابتدا محصولی به سبد خرید اضافه کنید."
        action={
          <Link to="/products" className="btn-primary mt-2">
            مشاهده محصولات
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <h1 className="text-xl font-bold text-ink-900">تکمیل سفارش</h1>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-700">اقلام سفارش</h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-ink-600">
            <span>
              {item.product?.title} × {item.quantity}
            </span>
            <span className="font-medium text-ink-800">{formatPrice((item.product?.price || 0) * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold">
          <span>جمع کل</span>
          <span className="text-brand-600">{formatPrice(total)}</span>
        </div>
      </div>

      {/* انتخاب آدرس - الزامی برای ثبت سفارش */}
      <div className="card space-y-3 p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
          <MapPin size={15} /> آدرس ارسال
        </h2>

        {addressesLoading ? (
          <Spinner className="py-4" />
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-ink-50 py-6 text-center">
            <p className="text-sm text-ink-500">شما هنوز هیچ آدرسی ثبت نکرده‌اید.</p>
            <Link to="/addresses" className="btn-primary text-sm">
              <Plus size={15} /> افزودن آدرس جدید
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  className="mt-1"
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                />
                <div>
                  <p className="font-medium text-ink-800">
                    {addr.province}، {addr.city}
                  </p>
                  <p className="mt-0.5 text-ink-500">{addr.adress}</p>
                  <p className="mt-0.5 text-xs text-ink-400" dir="ltr">
                    کد پستی: {addr.postal_code} — گیرنده: {addr.reciver_mobile}
                  </p>
                </div>
              </label>
            ))}
            <Link to="/addresses" className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline">
              + افزودن آدرس جدید
            </Link>
          </div>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <label className="label flex items-center gap-1.5">
          <Tag size={15} /> کد تخفیف (اختیاری)
        </label>
        <input
          className="input"
          dir="ltr"
          placeholder="SUMMER2024"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
        />
      </div>

      {/* انتخاب روش پرداخت */}
      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-700">روش پرداخت</h2>

        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
            paymentMethod === 'GATEWAY' ? 'border-brand-500 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            className="mt-0.5"
            checked={paymentMethod === 'GATEWAY'}
            onChange={() => setPaymentMethod('GATEWAY')}
          />
          <CreditCard size={17} className="text-brand-500" />
          <span className="flex-1 font-medium text-ink-800">پرداخت با درگاه</span>
          <span className="text-xs text-ink-400">شبیه‌سازی‌شده</span>
        </label>

        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
            paymentMethod === 'WALLET' ? 'border-brand-500 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            className="mt-0.5"
            checked={paymentMethod === 'WALLET'}
            onChange={() => setPaymentMethod('WALLET')}
          />
          <Wallet size={17} className="text-brand-500" />
          <span className="flex-1 font-medium text-ink-800">پرداخت با کیف پول</span>
          <span className="text-xs text-ink-500">
            {walletLoading
              ? 'در حال دریافت موجودی...'
              : wallet === null
                ? 'موجودی نامشخص'
                : `موجودی: ${formatPrice(walletBalance)}`}
          </span>
        </label>

        {walletInsufficient && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            موجودی کیف پول شما برای این سفارش کافی نیست. لطفا کیف پول را شارژ کنید یا از درگاه پرداخت استفاده کنید.
          </p>
        )}
      </div>

      <button
        onClick={handleCreateOrder}
        disabled={loading || addresses.length === 0}
        className="btn-primary w-full"
      >
        {loading ? 'در حال ثبت سفارش و پرداخت...' : paymentMethod === 'WALLET' ? 'ثبت نهایی سفارش و پرداخت با کیف پول' : 'ثبت نهایی سفارش و پرداخت'}
      </button>
      <p className="text-center text-xs text-ink-400">
        پرداخت بلافاصله پس از ثبت نهایی سفارش انجام می‌شود.
      </p>
    </div>
  );
}
