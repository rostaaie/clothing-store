import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket as TicketIcon, Plus } from 'lucide-react';
import { ticketApi } from '../../api/misc';
import { formatDateTime } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketApi.myTickets().then((d) => setTickets(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  // فقط تیکت‌های ریشه (شروع مکالمه) را نمایش می‌دهیم
  const roots = tickets.filter((t) => t.rootTicketId === t.id || !t.replyToId);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">تیکت‌های پشتیبانی</h1>
        <Link to="/tickets/new" className="btn-primary text-sm">
          <Plus size={16} /> تیکت جدید
        </Link>
      </div>

      {roots.length === 0 ? (
        <EmptyState icon={TicketIcon} title="تیکتی ثبت نکرده‌اید" description="در صورت داشتن سوال یا مشکل، تیکت جدید ثبت کنید." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {roots.map((t) => (
            <Link key={t.id} to={`/tickets/${t.rootTicketId || t.id}`} className="flex items-center justify-between p-4 hover:bg-ink-50">
              <div>
                <p className="font-medium text-ink-800">{t.title}</p>
                <p className="mt-1 text-xs text-ink-500">{t.subject}</p>
              </div>
              <span className="text-xs text-ink-400">{formatDateTime(t.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
