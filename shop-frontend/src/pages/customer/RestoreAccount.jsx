import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, ArrowRight } from 'lucide-react';
import { authApi } from '../../api/auth';
import { getErrorMessage } from '../../api/client';
import toast from 'react-hot-toast';

export default function RestoreAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobile, setMobile] = useState(searchParams.get('mobile') || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.requestRestore(mobile);
      toast.success('درخواست بازیابی ثبت شد؛ پس از تأیید پشتیبانی، حساب شما فعال می‌شود');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <RotateCcw size={24} />
        </div>
        <h1 className="text-2xl font-bold text-ink-900">بازیابی حساب کاربری</h1>
        <p className="mt-1 text-sm text-ink-500">
          اگر حساب شما به‌درستی حذف یا غیرفعال شده، با ثبت شماره موبایل، درخواست بازیابی دریافت می‌کنیم.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">شماره موبایل</label>
          <input
            className="input"
            dir="ltr"
            placeholder="09121234567"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'در حال ثبت درخواست...' : 'ثبت درخواست بازیابی'}
        </button>
      </form>

      <p className="text-center text-sm text-ink-500">
        حساب دارید و می‌خواهید وارد شوید؟{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          <ArrowRight size={14} className="inline" /> ورود
        </Link>
      </p>
    </div>
  );
}
