import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { walletApi } from '../../api/wallet';
import { formatPrice, formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

export default function AdminUserWallet() {
  const { userId } = useParams();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([walletApi.userWallet(userId), walletApi.userTransactions(userId)])
      .then(([w, t]) => {
        setWallet(w);
        setTransactions(Array.isArray(t) ? t : []);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/users" className="flex w-fit items-center gap-1 text-sm text-ink-500 hover:text-brand-600">
        <ArrowRight size={15} /> بازگشت به کاربران
      </Link>
      <h1 className="text-xl font-bold text-ink-900">کیف پول کاربر #{userId}</h1>

      <div className="card w-fit p-6">
        <p className="text-sm text-ink-500">موجودی</p>
        <p className="mt-1 text-2xl font-extrabold text-brand-600">{formatPrice(wallet?.balance ?? 0)}</p>
      </div>

      <div>
        <h2 className="mb-3 font-bold text-ink-900">تراکنش‌ها</h2>
        {transactions.length === 0 ? (
          <EmptyState title="تراکنشی ثبت نشده" />
        ) : (
          <div className="card divide-y divide-ink-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-ink-800">{tx.type}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(tx.createdAt)}</p>
                </div>
                <span className="font-bold text-ink-800">{formatPrice(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
