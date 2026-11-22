import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Tags, Upload, CornerDownLeft } from 'lucide-react';
import { categoriesApi } from '../../api/categories';
import { getCategoryPath, getDescendantIds } from '../../utils/categoryTree';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ImageOrPlaceholder from '../../components/ImageOrPlaceholder';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

// آرایه فلت دسته‌بندی‌ها را به درخت (والد > فرزند) تبدیل می‌کند
function buildTree(categories) {
  const byParent = {};
  categories.forEach((c) => {
    const key = c.parentId || 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  const attachChildren = (list) =>
    list.map((c) => ({ ...c, _children: attachChildren(byParent[c.id] || []) }));
  return attachChildren(byParent.root || []);
}

function CategoryRow({ node, depth, onEdit, onDelete }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3" style={{ paddingRight: depth * 24 }}>
          {depth > 0 && <CornerDownLeft size={14} className="text-ink-300" />}
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <ImageOrPlaceholder src={node.imageUrl} letter={node.title} letterClassName="text-sm" />
          </div>
          <span className="font-medium text-ink-800">{node.title}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => onEdit(node)} className="btn-ghost h-8 w-8 p-0">
            <Pencil size={15} />
          </button>
          <button onClick={() => onDelete(node.id)} className="btn-ghost h-8 w-8 p-0 text-red-500 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {node._children?.map((child) => (
        <CategoryRow key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    categoriesApi.list().then((d) => setCategories(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setTitle('');
    setExistingImageUrl('');
    setImageFile(null);
    setParentId('');
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setTitle(c.title);
    setExistingImageUrl(c.imageUrl || '');
    setImageFile(null);
    setParentId(c.parentId ? String(c.parentId) : '');
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر نباید بیشتر از 5 مگابایت باشد');
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title,
      parentId: parentId ? Number(parentId) : null,
    };
    try {
      let categoryId = editingId;
      if (editingId) {
        await categoriesApi.update(editingId, payload);
      } else {
        const created = await categoriesApi.create(payload);
        categoryId = created.id;
      }
      if (imageFile && categoryId) {
        await categoriesApi.uploadImage(categoryId, imageFile);
      }
      toast.success(editingId ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی ایجاد شد');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('آیا از حذف این دسته‌بندی مطمئن هستید؟ (زیردسته‌های آن به سطح اول منتقل می‌شوند)')) return;
    try {
      await categoriesApi.remove(id);
      toast.success('دسته‌بندی حذف شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : existingImageUrl;

  const tree = buildTree(categories);
  // در فرم انتخاب والد، خود دسته‌بندی در حال ویرایش نباید در لیست باشد
  const parentOptions = editingId
    ? categories.filter((c) => !getDescendantIds(categories, editingId).has(c.id))
    : categories;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">مدیریت دسته‌بندی‌ها</h1>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus size={16} /> دسته‌بندی جدید
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title="دسته‌بندی‌ای ثبت نشده" description="اولین دسته‌بندی را اضافه کنید." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {tree.map((node) => (
            <CategoryRow key={node.id} node={node} depth={0} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink-900">{editingId ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="label">عنوان دسته‌بندی</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={50} />
            </div>
            <div>
              <label className="label">دسته‌بندی والد (اختیاری)</label>
              <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— بدون والد (سطح اول) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryPath(categories, c.id)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-400">مثلاً «پوشاک مردانه» می‌تواند زیردسته «پوشاک» باشد.</p>
            </div>
            <div>
              <label className="label">تصویر دسته‌بندی (اختیاری)</label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ink-100">
                  <ImageOrPlaceholder src={previewSrc} letter={title} letterClassName="text-lg" />
                </div>
                <label className="btn-secondary cursor-pointer text-xs">
                  <Upload size={14} />
                  {imageFile ? imageFile.name.slice(0, 20) : 'انتخاب تصویر...'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <p className="mt-1 text-xs text-ink-400">فرمت مجاز: jpg, png, webp, gif — حداکثر 5 مگابایت</p>
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
