import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketApi } from '../../api/misc';
import { getErrorMessage } from '../../api/client';
import toast from 'react-hot-toast';

export default function TicketNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', subject: '', description: '' });
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ticket = await ticketApi.create(form);
      toast.success('تیکت با موفقیت ثبت شد');
      navigate(`/tickets/${ticket.rootTicketId || ticket.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-4">
      <h1 className="mb-6 text-xl font-bold text-ink-900">ثبت تیکت جدید</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">عنوان</label>
          <input className="input" value={form.title} onChange={update('title')} required minLength={5} maxLength={100} placeholder="مشکل در پرداخت سفارش" />
        </div>
        <div>
          <label className="label">موضوع</label>
          <input className="input" value={form.subject} onChange={update('subject')} required placeholder="پشتیبانی فنی" />
        </div>
        <div>
          <label className="label">توضیحات</label>
          <textarea className="input min-h-[120px]" value={form.description} onChange={update('description')} required minLength={10} placeholder="مشکل خود را با جزئیات شرح دهید..." />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'در حال ثبت...' : 'ثبت تیکت'}
        </button>
      </form>
    </div>
  );
}
