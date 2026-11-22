import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Package, Upload } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { formatPrice } from '../../utils/format';
import { getCategoryPath, buildCategoryTree } from '../../utils/categoryTree';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ImageOrPlaceholder from '../../components/ImageOrPlaceholder';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

const emptyForm = { title: '', description: '', price: '', stock: '', categoryIds: [], hasVariants: false, variants: [] };
const emptyVariantRow = () => ({ size: '', color: '', colorCode: '#1c1e26', stock: '' });

/**
 * انتخاب‌گر پلکانی دسته‌بندی: ابتدا دسته والد (پوشاک زنانه/مردانه)، سپس زیرشاخه (لباس/کفش)
 * و در صورت وجود، زیرشاخه‌ی آن انتخاب می‌شود. چون هر مرحله فقط بر اساس مرحله‌ی قبلی فیلتر
 * می‌شود، دیگر امکان قاطی‌کردن «لباس زنانه» با «لباس مردانه» وجود ندارد؛ چیزی که در حالت
 * قبلی (لیست تخت همه‌ی دسته‌بندی‌ها) به‌راحتی پیش می‌آمد.
 */
function CategoryPicker({ categories, selectedIds, onAdd, onRemove }) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const [rootId, setRootId] = useState('');
  const [level2Id, setLevel2Id] = useState('');
  const [level3Id, setLevel3Id] = useState('');

  const rootNode = tree.find((r) => String(r.id) === rootId);
  const level2Options = rootNode?.children || [];
  const level2Node = level2Options.find((c) => String(c.id) === level2Id);
  const level3Options = level2Node?.children || [];

  const resetBelow = (level) => {
    if (level <= 2) setLevel2Id('');
    if (level <= 3) setLevel3Id('');
  };

  // آیدی نهایی قابل افزودن: عمیق‌ترین سطحی که کاربر تا الان انتخاب کرده
  const resolvedId = level3Id || level2Id || rootId;

  const handleAdd = () => {
    if (!resolvedId) return;
    onAdd(Number(resolvedId));
    setRootId('');
    setLevel2Id('');
    setLevel3Id('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedIds.map((id) => (
          <span key={id} className="badge flex items-center gap-1 bg-brand-500 text-white">
            {getCategoryPath(categories, id)}
            <button type="button" onClick={() => onRemove(id)} className="mr-0.5">
              <X size={12} />
            </button>
          </span>
        ))}
        {selectedIds.length === 0 && <p className="text-xs text-ink-400">هنوز دسته‌بندی‌ای انتخاب نشده است.</p>}
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-dashed border-ink-200 p-3 sm:grid-cols-3">
        <select
          className="input"
          value={rootId}
          onChange={(e) => {
            setRootId(e.target.value);
            resetBelow(2);
          }}
        >
          <option value="">دسته اصلی...</option>
          {tree.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={level2Id}
          disabled={!rootId || level2Options.length === 0}
          onChange={(e) => {
            setLevel2Id(e.target.value);
            resetBelow(3);
          }}
        >
          <option value="">{rootId ? 'زیردسته...' : '—'}</option>
          {level2Options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select className="input" value={level3Id} disabled={!level2Id || level3Options.length === 0} onChange={(e) => setLevel3Id(e.target.value)}>
          <option value="">{level2Id ? 'زیرشاخه...' : '—'}</option>
          {level3Options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {resolvedId && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
          <span>مسیر انتخاب‌شده: {getCategoryPath(categories, Number(resolvedId))}</span>
          <button type="button" onClick={handleAdd} disabled={selectedIds.includes(Number(resolvedId))} className="btn-secondary h-7 px-3 text-xs disabled:opacity-50">
            {selectedIds.includes(Number(resolvedId)) ? 'قبلاً افزوده شد' : 'افزودن'}
          </button>
        </div>
      )}
      {categories.length === 0 && <p className="text-xs text-ink-400">ابتدا یک دسته‌بندی ایجاد کنید.</p>}
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([productsApi.list(), categoriesApi.list()])
      .then(([p, c]) => {
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(emptyForm);
    setExistingImageUrl('');
    setImageFile(null);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      title: p.title,
      description: p.description,
      price: p.price,
      stock: p.stock,
      categoryIds: p.categories?.map((c) => c.id) || [],
      hasVariants: Boolean(p.variants?.length),
      variants: p.variants?.length
        ? p.variants.map((v) => ({ size: v.size || '', color: v.color || '', colorCode: v.colorCode || '#1c1e26', stock: v.stock }))
        : [],
    });
    setExistingImageUrl(p.imageUrl || '');
    setImageFile(null);
    setEditingId(p.id);
    setShowForm(true);
  };

  const addCategory = (id) => {
    setForm((f) => (f.categoryIds.includes(id) ? f : { ...f, categoryIds: [...f.categoryIds, id] }));
  };

  const removeCategory = (id) => {
    setForm((f) => ({ ...f, categoryIds: f.categoryIds.filter((c) => c !== id) }));
  };

  const toggleHasVariants = (checked) => {
    setForm((f) => ({ ...f, hasVariants: checked, variants: checked && f.variants.length === 0 ? [emptyVariantRow()] : f.variants }));
  };

  const addVariantRow = () => {
    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariantRow()] }));
  };

  const updateVariantRow = (index, field, value) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    }));
  };

  const removeVariantRow = (index) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
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

    if (form.hasVariants) {
      const invalidRow = form.variants.find((v) => v.stock === '' || Number(v.stock) < 0 || Number.isNaN(Number(v.stock)));
      if (form.variants.length === 0 || invalidRow) {
        toast.error('برای هر ترکیب سایز/رنگ باید موجودی معتبر وارد کنید');
        return;
      }
    }

    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      stock: form.hasVariants ? 0 : Number(form.stock),
      categoryIds: form.categoryIds,
      variants: form.hasVariants
        ? form.variants.map((v) => ({
            size: v.size?.trim() || undefined,
            color: v.color?.trim() || undefined,
            colorCode: v.color?.trim() ? v.colorCode : undefined,
            stock: Number(v.stock),
          }))
        : [],
    };
    try {
      let productId = editingId;
      if (editingId) {
        await productsApi.update(editingId, payload);
      } else {
        const created = await productsApi.create(payload);
        productId = created.id;
      }
      if (imageFile && productId) {
        await productsApi.uploadImage(productId, imageFile);
      }
      toast.success(editingId ? 'محصول ویرایش شد' : 'محصول ایجاد شد');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
    try {
      await productsApi.remove(id);
      toast.success('محصول حذف شد');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : existingImageUrl;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">مدیریت محصولات</h1>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus size={16} /> محصول جدید
        </button>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="محصولی ثبت نشده" description="اولین محصول فروشگاه خود را اضافه کنید." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-right text-ink-500">
                <th className="p-3 font-medium"></th>
                <th className="p-3 font-medium">عنوان</th>
                <th className="p-3 font-medium">قیمت</th>
                <th className="p-3 font-medium">موجودی</th>
                <th className="p-3 font-medium">دسته‌بندی</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                  <td className="p-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg">
                      <ImageOrPlaceholder src={p.imageUrl} letter={p.title} letterClassName="text-sm" />
                    </div>
                  </td>
                  <td className="p-3 font-medium text-ink-800">{p.title}</td>
                  <td className="p-3 text-ink-600">{formatPrice(p.price)}</td>
                  <td className="p-3 text-ink-600">{p.stock}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.categories?.map((c) => (
                        <span key={c.id} className="badge bg-ink-100 text-ink-600">
                          {getCategoryPath(categories, c.id) || c.title}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="btn-ghost h-8 w-8 p-0">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="btn-ghost h-8 w-8 p-0 text-red-500 hover:bg-red-50">
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
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-lg space-y-4 overflow-y-auto p-6" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink-900">{editingId ? 'ویرایش محصول' : 'محصول جدید'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="label">عنوان</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required minLength={3} />
            </div>
            <div>
              <label className="label">توضیحات</label>
              <textarea className="input min-h-[90px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div>
              <label className="label">تصویر محصول (اختیاری)</label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ink-100">
                  <ImageOrPlaceholder src={previewSrc} letter={form.title} letterClassName="text-lg" />
                </div>
                <label className="btn-secondary cursor-pointer text-xs">
                  <Upload size={14} />
                  {imageFile ? imageFile.name.slice(0, 20) : 'انتخاب تصویر...'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <p className="mt-1 text-xs text-ink-400">فرمت مجاز: jpg, png, webp, gif — حداکثر 5 مگابایت</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">قیمت (تومان)</label>
                <input className="input" type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              </div>
              {!form.hasVariants && (
                <div>
                  <label className="label">موجودی</label>
                  <input className="input" type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-ink-100 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={form.hasVariants}
                  onChange={(e) => toggleHasVariants(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                این محصول سایز/رنگ مختلف دارد (مثل لباس یا کفش)
              </label>
              <p className="mt-1 text-xs text-ink-400">
                اگر فعال باشد، موجودی برای هر ترکیب سایز/رنگ جدا وارد می‌شود و موجودی کل محصول خودکار از جمع آن‌ها محاسبه می‌شود.
              </p>

              {form.hasVariants && (
                <div className="mt-3 flex flex-col gap-2">
                  {form.variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg bg-ink-50 p-2">
                      <input
                        className="input col-span-3 h-9 text-sm"
                        placeholder="سایز (مثلاً M)"
                        value={v.size}
                        onChange={(e) => updateVariantRow(i, 'size', e.target.value)}
                      />
                      <input
                        className="input col-span-3 h-9 text-sm"
                        placeholder="رنگ (مثلاً مشکی)"
                        value={v.color}
                        onChange={(e) => updateVariantRow(i, 'color', e.target.value)}
                      />
                      <input
                        type="color"
                        title="کد رنگ برای نمایش نمونه"
                        value={v.colorCode}
                        onChange={(e) => updateVariantRow(i, 'colorCode', e.target.value)}
                        className="col-span-1 h-9 w-full cursor-pointer rounded border border-ink-200 bg-white p-0.5"
                      />
                      <input
                        type="number"
                        min={0}
                        className="input col-span-3 h-9 text-sm"
                        placeholder="موجودی"
                        value={v.stock}
                        onChange={(e) => updateVariantRow(i, 'stock', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeVariantRow(i)}
                        className="btn-ghost col-span-2 h-9 w-9 justify-self-end p-0 text-red-500 hover:bg-red-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addVariantRow} className="btn-secondary mt-1 h-8 self-start px-3 text-xs">
                    <Plus size={13} /> افزودن ترکیب سایز/رنگ
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="label">دسته‌بندی‌ها</label>
              <CategoryPicker categories={categories} selectedIds={form.categoryIds} onAdd={addCategory} onRemove={removeCategory} />
              <p className="mt-1 text-xs text-ink-400">
                ابتدا دسته اصلی (مثلاً پوشاک زنانه)، سپس زیردسته (مثلاً لباس) و در صورت وجود، زیرشاخه را انتخاب کنید؛ این‌طوری هرگز «لباس زنانه» با «لباس مردانه» قاطی نمی‌شود.
              </p>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'در حال ذخیره...' : 'ذخیره محصول'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
