import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, isAccountNeedsRestore } from '../../api/client';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ mobile: '', display_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [needsRestore, setNeedsRestore] = useState(false);

  const update = (key) => (e) => {
    if (key === 'mobile') setNeedsRestore(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedsRestore(false);
    try {
      await register(form.mobile, form.password, form.display_name);
      toast.success('ثبت‌نام با موفقیت انجام شد');
      navigate('/', { replace: true });
    } catch (err) {
      // فقط وقتی شماره قبلاً مربوط به حساب غیرفعال است، دکمه بازیابی را نشان بده
      setNeedsRestore(isAccountNeedsRestore(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink-900">ساخت حساب کاربری</h1>
        <p className="mt-1 text-sm text-ink-500">چند ثانیه‌ای عضو فروشگاه شوید</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">نام نمایشی</label>
          <input className="input" placeholder="علی احمدی" value={form.display_name} onChange={update('display_name')} required minLength={2} maxLength={16} />
        </div>
        <div>
          <label className="label">شماره موبایل</label>
          <input className="input" dir="ltr" placeholder="09121234567" value={form.mobile} onChange={update('mobile')} required />
        </div>
        <div>
          <label className="label">رمز عبور</label>
          <input type="password" className="input" dir="ltr" value={form.password} onChange={update('password')} required minLength={3} maxLength={16} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
        </button>
      </form>
      {needsRestore && (
        <div className="card flex flex-col items-center gap-3 bg-amber-50/60 p-4 text-center">
          <p className="text-sm text-ink-700">
            این شماره قبلاً در سیستم ثبت شده و حساب آن غیرفعال است. برای بازیابیِ حساب قبلی، درخواست ثبت کنید.
          </p>
          <Link
            to={`/restore-account?mobile=${encodeURIComponent(form.mobile)}`}
            className="btn-primary w-full"
          >
            درخواست بازیابی حساب
          </Link>
        </div>
      )}
      <p className="text-center text-sm text-ink-500">
        قبلا ثبت‌نام کرده‌اید؟{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          وارد شوید
        </Link>
      </p>
    </div>
  );
}
