import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Users as UsersIcon, Wallet, Eye, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usersApi } from '../../api/misc';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const emptyForm = { mobile: '', display_name: '', password: '', role: 'user' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    usersApi
      .list({ limit: 1000, page: 1, ...(roleFilter ? { role: roleFilter } : {}) })
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [roleFilter]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.mobile?.includes(q) ||
        String(u.id).includes(q),
    );
  }, [users, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setForm({ mobile: u.mobile, display_name: u.display_name, password: '', role: u.role });
    setEditingId(u.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await usersApi.update(editingId, { display_name: form.display_name, role: form.role });
        toast.success('کاربر ویرایش شد');
      } else {
        await usersApi.create(form);
        toast.success('کاربر ایجاد شد');
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
    if (!confirm('آیا از حذف این کاربر مطمئن هستید؟')) return;
    try {
      await usersApi.remove(id);
      toast.success('کاربر حذف شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink-900">مدیریت کاربران</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input w-56 pr-8"
              placeholder="جستجو بر اساس نام، موبایل یا آیدی..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">همه نقش‌ها</option>
            <option value="user">کاربر عادی</option>
            <option value="admin">ادمین</option>
          </select>
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus size={16} /> کاربر جدید
          </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState icon={UsersIcon} title="کاربری یافت نشد" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-ink-500">
                <th className="p-3 font-medium">آیدی</th>
                <th className="p-3 font-medium">نام</th>
                <th className="p-3 font-medium">موبایل</th>
                <th className="p-3 font-medium">نقش</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                  <td className="p-3 font-mono text-ink-500">#{u.id}</td>
                  <td className="p-3 font-medium text-ink-800">{u.display_name}</td>
                  <td className="p-3 text-ink-600" dir="ltr">
                    {u.mobile}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-ink-100 text-ink-600'}`}>
                      {u.role === 'admin' ? 'ادمین' : 'کاربر عادی'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/users/${u.id}`} className="btn-ghost h-8 w-8 p-0" title="مشاهده جزئیات">
                        <Eye size={15} />
                      </Link>
                      <Link to={`/admin/wallet/${u.id}`} className="btn-ghost h-8 w-8 p-0" title="کیف پول">
                        <Wallet size={15} />
                      </Link>
                      <button onClick={() => openEdit(u)} className="btn-ghost h-8 w-8 p-0">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="btn-ghost h-8 w-8 p-0 text-red-500 hover:bg-red-50">
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
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink-900">{editingId ? 'ویرایش کاربر' : 'کاربر جدید'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="label">نام نمایشی</label>
              <input className="input" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} required />
            </div>
            {!editingId && (
              <>
                <div>
                  <label className="label">موبایل</label>
                  <input className="input" dir="ltr" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">رمز عبور</label>
                  <input type="password" className="input" dir="ltr" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
              </>
            )}
            <div>
              <label className="label">نقش</label>
              <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="user">کاربر عادی</option>
                <option value="admin">ادمین</option>
              </select>
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
