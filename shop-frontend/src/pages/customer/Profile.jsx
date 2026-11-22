import { useEffect, useState } from 'react';
import { User, Phone, ShieldCheck, KeyRound } from 'lucide-react';
import { profileApi } from '../../api/misc';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { formatDate } from '../../utils/format';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  admin: 'ادمین',
  user: 'کاربر عادی',
};

export default function Profile() {
  const { updateLocalDisplayName } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    profileApi
      .me()
      .then((data) => {
        setProfile(data);
        setDisplayName(data.display_name || '');
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const updated = await profileApi.updateDisplayName(displayName.trim());
      setProfile(updated);
      updateLocalDisplayName(updated.display_name);
      toast.success('نام نمایشی با موفقیت تغییر کرد');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('رمز عبور جدید و تکرار آن یکسان نیستند');
      return;
    }
    setSavingPassword(true);
    try {
      await profileApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('رمز عبور با موفقیت تغییر کرد');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <Spinner />;
  if (!profile) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900">پروفایل من</h1>
        <p className="mt-1 text-sm text-ink-500">اطلاعات حساب کاربری خود را مشاهده و ویرایش کنید</p>
      </div>

      {/* اطلاعات پایه (فقط نمایشی) */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-3 text-sm">
          <Phone size={17} className="text-ink-400" />
          <span className="text-ink-500">شماره موبایل</span>
          <span dir="ltr" className="mr-auto font-medium text-ink-800">{profile.mobile}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <ShieldCheck size={17} className="text-ink-400" />
          <span className="text-ink-500">نقش</span>
          <span className="mr-auto font-medium text-ink-800">{ROLE_LABELS[profile.role] || profile.role}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <User size={17} className="text-ink-400" />
          <span className="text-ink-500">عضو از</span>
          <span className="mr-auto font-medium text-ink-800">{formatDate(profile.createdAt)}</span>
        </div>
        <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-400">
          شماره موبایل شناسه ورود شماست و از این صفحه قابل تغییر نیست.
        </p>
      </div>

      {/* ویرایش نام نمایشی */}
      <form onSubmit={handleNameSubmit} className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <User size={17} /> ویرایش نام نمایشی
        </h2>
        <div>
          <label className="label">نام نمایشی</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={16}
            required
          />
        </div>
        <button type="submit" disabled={savingName} className="btn-primary">
          {savingName ? 'در حال ذخیره...' : 'ذخیره نام'}
        </button>
      </form>

      {/* تغییر رمز عبور */}
      <form onSubmit={handlePasswordSubmit} className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <KeyRound size={17} /> تغییر رمز عبور
        </h2>
        <div>
          <label className="label">رمز عبور فعلی</label>
          <input
            type="password"
            dir="ltr"
            className="input"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">رمز عبور جدید</label>
          <input
            type="password"
            dir="ltr"
            className="input"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            minLength={3}
            required
          />
        </div>
        <div>
          <label className="label">تکرار رمز عبور جدید</label>
          <input
            type="password"
            dir="ltr"
            className="input"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            minLength={3}
            required
          />
        </div>
        <button type="submit" disabled={savingPassword} className="btn-primary">
          {savingPassword ? 'در حال تغییر...' : 'تغییر رمز عبور'}
        </button>
      </form>
    </div>
  );
}
