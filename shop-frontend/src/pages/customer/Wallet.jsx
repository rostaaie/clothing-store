import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { walletApi } from '../../api/wallet';
import { formatPrice, formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

const TX_LABELS = {
  DEPOSIT: 'شارژ کیف پول',
  WITHDRAW: 'برداشت',
  REFUND: 'استرداد وجه',
  BONUS: 'پاداش',
  PURCHASE: 'خرید',
  ORDER_PAYMENT: 'پرداخت سفارش',
  CASHBACK: 'بازگشت وجه',
};

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('deposit');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([walletApi.myWallet(), walletApi.myTransactions()]);
      setWallet(w);
      setTransactions(Array.isArray(t) ? t : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < 1000) {
      toast.error('حداقل مبلغ ۱۰۰۰ تومان است');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'deposit') {
        await walletApi.deposit(value);
        toast.success('کیف پول با موفقیت شارژ شد');
      } else {
        await walletApi.withdraw(value);
        toast.success('برداشت با موفقیت انجام شد');
      }
      setAmount('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <h1 className="text-xl font-bold text-ink-900">کیف پول</h1>

      <div className="card flex items-center gap-4 bg-gradient-to-l from-brand-500 to-brand-700 p-6 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <WalletIcon size={24} />
        </div>
        <div>
          <p className="text-sm text-brand-50">موجودی کیف پول</p>
          <p className="text-2xl font-extrabold">{formatPrice(wallet?.balance ?? 0)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('deposit')} className={`btn flex-1 text-sm ${mode === 'deposit' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'}`}>
            <ArrowDownCircle size={15} /> شارژ کیف پول
          </button>
          <button type="button" onClick={() => setMode('withdraw')} className={`btn flex-1 text-sm ${mode === 'withdraw' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'}`}>
            <ArrowUpCircle size={15} /> برداشت
          </button>
        </div>
        <div>
          <label className="label">مبلغ (تومان)</label>
          <input className="input" type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'در حال پردازش...' : mode === 'deposit' ? 'شارژ کیف پول' : 'برداشت از کیف پول'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-bold text-ink-900">تراکنش‌ها</h2>
        {transactions.length === 0 ? (
          <EmptyState title="تراکنشی ثبت نشده" description="تراکنش‌های کیف پول شما اینجا نمایش داده می‌شود." />
        ) : (
          <div className="card divide-y divide-ink-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-ink-800">{TX_LABELS[tx.status] || tx.status}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(tx.createdAt)}</p>
                </div>
                <span className={`font-bold ${['DEPOSIT', 'REFUND', 'BONUS', 'CASHBACK'].includes(tx.status) ? 'text-green-600' : 'text-red-500'}`}>
                  {['DEPOSIT', 'REFUND', 'BONUS', 'CASHBACK'].includes(tx.status) ? '+' : '-'} {formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
