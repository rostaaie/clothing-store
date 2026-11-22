import { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, X } from 'lucide-react';
import { addressApi } from '../../api/address';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const emptyForm = { province: '', city: '', adress: '', postal_code: '', reciver_mobile: '', description: '' };

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    addressApi.list().then((d) => setAddresses(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setForm({
      province: addr.province,
      city: addr.city,
      adress: addr.adress,
      postal_code: addr.postal_code,
      reciver_mobile: addr.reciver_mobile,
      description: addr.description || '',
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await addressApi.update(editingId, form);
        toast.success('آدرس ویرایش شد');
      } else {
        await addressApi.create(form);
        toast.success('آدرس اضافه شد');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('آیا از حذف این آدرس مطمئن هستید؟')) return;
    try {
      await addressApi.remove(id);
      toast.success('آدرس حذف شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">آدرس‌های من</h1>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus size={16} /> افزودن آدرس
        </button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="آدرسی ثبت نکرده‌اید" description="برای ثبت سفارش، ابتدا یک آدرس اضافه کنید." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="card flex flex-col gap-2 p-4">
              <p className="font-medium text-ink-800">
                {addr.province}، {addr.city}
              </p>
              <p className="text-sm text-ink-600">{addr.adress}</p>
              <p className="text-xs text-ink-400">کد پستی: {addr.postal_code}</p>
              <p className="text-xs text-ink-400" dir="ltr">
                {addr.reciver_mobile}
              </p>
              {addr.description && <p className="text-xs text-ink-500">{addr.description}</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={() => openEdit(addr)} className="btn-secondary flex-1 text-xs">
                  <Pencil size={13} /> ویرایش
                </button>
                <button onClick={() => handleDelete(addr.id)} className="btn-secondary flex-1 text-xs text-red-600">
                  <Trash2 size={13} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink-900">{editingId ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">استان</label>
                <input className="input" value={form.province} onChange={update('province')} required />
              </div>
              <div>
                <label className="label">شهر</label>
                <input className="input" value={form.city} onChange={update('city')} required />
              </div>
            </div>
            <div>
              <label className="label">آدرس دقیق</label>
              <input className="input" value={form.adress} onChange={update('adress')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">کد پستی (۱۰ رقم)</label>
                <input className="input" dir="ltr" maxLength={10} value={form.postal_code} onChange={update('postal_code')} required />
              </div>
              <div>
                <label className="label">موبایل گیرنده</label>
                <input className="input" dir="ltr" maxLength={11} value={form.reciver_mobile} onChange={update('reciver_mobile')} required />
              </div>
            </div>
            <div>
              <label className="label">توضیحات (اختیاری)</label>
              <input className="input" value={form.description} onChange={update('description')} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'در حال ذخیره...' : 'ذخیره آدرس'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
