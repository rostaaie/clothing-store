import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, isAccountNeedsRestore } from '../../api/client';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsRestore, setNeedsRestore] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedsRestore(false);
    try {
      await login(mobile, password);
      toast.success('خوش آمدید!');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      // فقط وقتی شماره مربوط به حساب غیرفعال است، دکمه بازیابی را نشان بده
      setNeedsRestore(isAccountNeedsRestore(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink-900">ورود به حساب کاربری</h1>
        <p className="mt-1 text-sm text-ink-500">با شماره موبایل و رمز عبور خود وارد شوید</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">شماره موبایل</label>
          <input
            className="input"
            dir="ltr"
            placeholder="09121234567"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              setNeedsRestore(false);
            }}
            required
          />
        </div>
        <div>
          <label className="label">رمز عبور</label>
          <input
            type="password"
            className="input"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
      {needsRestore && (
        <div className="card flex flex-col items-center gap-3 bg-amber-50/60 p-4 text-center">
          <p className="text-sm text-ink-700">
            حساب این شماره غیرفعال شده است. برای بازیابی حساب خود درخواست ثبت کنید.
          </p>
          <Link
            to={`/restore-account?mobile=${encodeURIComponent(mobile)}`}
            className="btn-primary w-full"
          >
            درخواست بازیابی حساب
          </Link>
        </div>
      )}
      <p className="text-center text-sm text-ink-500">
        حساب کاربری ندارید؟{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          ثبت‌نام کنید
        </Link>
      </p>
    </div>
  );
}
