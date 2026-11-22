import { useEffect, useState } from 'react';
import { Check, X, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { restoreRequestApi } from '../../api/misc';
import { getErrorMessage } from '../../api/client';
import { formatDateTime } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const STATUS_LABELS = { pending: 'در انتظار بررسی', approved: 'تأیید شده', rejected: 'رد شده' };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminRestoreRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actingId, setActingId] = useState(null);

  const load = () => {
    setLoading(true);
    restoreRequestApi
      .list(statusFilter || undefined)
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const approve = async (id) => {
    if (!confirm('حساب کاربرِ این شماره بازگردانی و درخواست تأیید می‌شود. ادامه می‌دهید؟')) return;
    setActingId(id);
    try {
      await restoreRequestApi.approve(id);
      toast.success('درخواست تأیید شد؛ حساب کاربر فعال شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    const note = prompt('توضیح (اختیاری):');
    setActingId(id);
    try {
      await restoreRequestApi.updateStatus(id, 'rejected', note || undefined);
      toast.success('درخواست رد شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('این درخواست حذف شود؟')) return;
    setActingId(id);
    try {
      await restoreRequestApi.remove(id);
      toast.success('درخواست حذف شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-900">درخواست‌های بازیابی حساب</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار بررسی</option>
            <option value="approved">تأیید شده</option>
            <option value="rejected">رد شده</option>
          </select>
          <button onClick={load} className="btn-secondary text-sm">
            <RefreshCw size={15} /> به‌روزرسانی
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={RotateCcw} title="درخواست بازیابی‌ای وجود ندارد" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-ink-500">
                <th className="p-3 font-medium">موبایل</th>
                <th className="p-3 font-medium">کاربر</th>
                <th className="p-3 font-medium">وضعیت</th>
                <th className="p-3 font-medium">توضیح</th>
                <th className="p-3 font-medium">تاریخ ثبت</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                  <td className="p-3 text-ink-700" dir="ltr">
                    {r.mobile}
                  </td>
                  <td className="p-3 text-ink-600">
                    {r.user?.display_name ? (
                      <>
                        {r.user.display_name}{' '}
                        <span className="font-mono text-ink-400">#{r.user.id}</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${STATUS_COLORS[r.status] || 'bg-ink-100 text-ink-600'}`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate p-3 text-ink-500" title={r.note || ''}>
                    {r.note || '-'}
                  </td>
                  <td className="p-3 text-ink-500">{formatDateTime(r.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approve(r.id)}
                            disabled={actingId === r.id}
                            className="btn-ghost h-8 items-center gap-1 px-2 text-green-600 hover:bg-green-50"
                            title="تأیید و بازگردانی حساب"
                          >
                            <Check size={15} /> تأیید و بازگردانی
                          </button>
                          <button
                            onClick={() => reject(r.id)}
                            disabled={actingId === r.id}
                            className="btn-ghost h-8 items-center gap-1 px-2 text-red-500 hover:bg-red-50"
                            title="رد درخواست"
                          >
                            <X size={15} /> رد
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={actingId === r.id}
                        className="btn-ghost h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                        title="حذف درخواست"
                      >
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
    </div>
  );
}
