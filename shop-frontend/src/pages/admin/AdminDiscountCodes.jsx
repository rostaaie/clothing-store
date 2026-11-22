import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Percent } from 'lucide-react';
import { discountApi } from '../../api/misc';
import { formatPrice, formatDate } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const emptyForm = { code: '', percent: '', amount: '', maxUsage: '', expireAt: '', minPurchaseAmount: '' };

export default function AdminDiscountCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    discountApi.list().then((d) => setCodes(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setForm({
      code: c.code,
      percent: c.percent || '',
      amount: c.amount || '',
      maxUsage: c.maxUsage,
      expireAt: c.expireAt ? c.expireAt.slice(0, 10) : '',
      minPurchaseAmount: c.minPurchaseAmount || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code,
      maxUsage: Number(form.maxUsage) || 0,
      ...(form.percent ? { percent: Number(form.percent) } : {}),
      ...(form.amount ? { amount: Number(form.amount) } : {}),
      ...(form.expireAt ? { expireAt: new Date(form.expireAt).toISOString() } : {}),
      ...(form.minPurchaseAmount ? { minPurchaseAmount: Number(form.minPurchaseAmount) } : {}),
    };
    try {
      if (editingId) {
        await discountApi.update(editingId, payload);
        toast.success('کد تخفیف ویرایش شد');
      } else {
        await discountApi.create(payload);
        toast.success('کد تخفیف ایجاد شد');
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
    if (!confirm('آیا از حذف این کد تخفیف مطمئن هستید؟')) return;
    try {
      await discountApi.remove(id);
      toast.success('کد تخفیف حذف شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">کدهای تخفیف</h1>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus size={16} /> کد تخفیف جدید
        </button>
      </div>

      {codes.length === 0 ? (
        <EmptyState icon={Percent} title="کد تخفیفی ثبت نشده" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-ink-500">
                <th className="p-3 font-medium">کد</th>
                <th className="p-3 font-medium">مقدار تخفیف</th>
                <th className="p-3 font-medium">استفاده</th>
                <th className="p-3 font-medium">انقضا</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                  <td className="p-3 font-mono font-medium text-ink-800" dir="ltr">
                    {c.code}
                  </td>
                  <td className="p-3 text-ink-600">{c.percent ? `${c.percent}%` : formatPrice(c.amount)}</td>
                  <td className="p-3 text-ink-600">
                    {c.usageCount} / {c.maxUsage}
                  </td>
                  <td className="p-3 text-ink-600">{c.expireAt ? formatDate(c.expireAt) : 'بدون انقضا'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="btn-ghost h-8 w-8 p-0">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="btn-ghost h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink-900">{editingId ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="label">کد</label>
              <input className="input" dir="ltr" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required minLength={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">درصد تخفیف</label>
                <input className="input" type="number" min={1} max={100} value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value, amount: '' }))} placeholder="مثلا 15" />
              </div>
              <div>
                <label className="label">مبلغ ثابت (تومان)</label>
                <input className="input" type="number" min={1000} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value, percent: '' }))} placeholder="مثلا 50000" />
              </div>
            </div>
            <p className="text-xs text-ink-400">فقط یکی از دو فیلد درصد یا مبلغ ثابت را پر کنید.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">حداکثر تعداد استفاده</label>
                <input className="input" type="number" min={0} value={form.maxUsage} onChange={(e) => setForm((f) => ({ ...f, maxUsage: e.target.value }))} required />
              </div>
              <div>
                <label className="label">تاریخ انقضا</label>
                <input className="input" type="date" value={form.expireAt} onChange={(e) => setForm((f) => ({ ...f, expireAt: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">حداقل مبلغ خرید (تومان)</label>
              <input className="input" type="number" min={0} value={form.minPurchaseAmount} onChange={(e) => setForm((f) => ({ ...f, minPurchaseAmount: e.target.value }))} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
