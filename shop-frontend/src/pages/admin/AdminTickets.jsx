import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket as TicketIcon, Search, Copy } from 'lucide-react';
import { ticketApi, usersApi } from '../../api/misc';
import { formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

function copyId(id) {
  navigator.clipboard?.writeText(id);
  toast.success('شناسه کپی شد');
}

function TicketRow({ t, showUser }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 hover:bg-ink-50">
      <Link to={`/tickets/${t.rootTicketId || t.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink-800">{t.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span>{t.subject}</span>
          {showUser && (
            <span>
              · کاربر: {t.user?.display_name ? `${t.user.display_name} (#${t.userId})` : `#${t.userId}`}
            </span>
          )}
        </p>
      </Link>
      <button
        onClick={() => copyId(t.id)}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-ink-100 px-2 py-1 font-mono text-[11px] text-ink-500 hover:bg-ink-200"
        title="کپی شناسه کامل تیکت"
      >
        <Copy size={11} />
        {t.id.slice(0, 8)}...
      </button>
      <span className="shrink-0 text-xs text-ink-400">{formatDateTime(t.createdAt)}</span>
    </div>
  );
}

export default function AdminTickets() {
  const [tab, setTab] = useState('threads');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [idSearch, setIdSearch] = useState('');

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTickets, setUserTickets] = useState(null);
  const [searchingTickets, setSearchingTickets] = useState(false);

  useEffect(() => {
    if (tab !== 'threads') return;
    setLoading(true);
    ticketApi
      .threads(page, 10, idSearch.trim() || undefined)
      .then((d) => setThreads(Array.isArray(d) ? d : d?.data || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [tab, page, idSearch]);

  useEffect(() => {
    if (tab !== 'byUser') return;
    // برای جست‌وجوی راحت، لیست کاربران یک‌بار گرفته می‌شود تا با نام/موبایل قابل‌جستجو باشد
    usersApi.list({ limit: 1000, page: 1 }).then((d) => setUsers(Array.isArray(d) ? d : []));
  }, [tab]);

  const matchedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => u.display_name?.toLowerCase().includes(q) || u.mobile?.includes(q) || String(u.id).includes(q))
      .slice(0, 6);
  }, [users, userSearch]);

  const pickUser = async (u) => {
    setSelectedUser(u);
    setUserSearch(`${u.display_name} (${u.mobile})`);
    setSearchingTickets(true);
    try {
      const d = await ticketApi.userTickets(u.id);
      setUserTickets(Array.isArray(d) ? d : []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSearchingTickets(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink-900">مدیریت تیکت‌های پشتیبانی</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('threads')} className={`btn text-sm ${tab === 'threads' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'}`}>
          همه مکالمه‌ها
        </button>
        <button onClick={() => setTab('byUser')} className={`btn text-sm ${tab === 'byUser' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'}`}>
          جستجو بر اساس کاربر
        </button>
      </div>

      {tab === 'threads' && (
        <>
          <div className="card flex items-center gap-2 p-4">
            <Search size={15} className="shrink-0 text-ink-400" />
            <input
              className="input flex-1"
              dir="ltr"
              placeholder="جستجو بر اساس شناسه تیکت..."
              value={idSearch}
              onChange={(e) => {
                setPage(1);
                setIdSearch(e.target.value);
              }}
            />
            {idSearch && (
              <button onClick={() => { setPage(1); setIdSearch(''); }} className="btn-ghost text-xs text-ink-400">
                پاک کردن
              </button>
            )}
          </div>
          {loading ? (
            <Spinner />
          ) : threads.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title={idSearch ? 'تیکتی با این شناسه یافت نشد' : 'تیکتی ثبت نشده'}
            />
          ) : (
            <div className="card divide-y divide-ink-100">
              {threads.map((t) => (
                <TicketRow key={t.id} t={t} showUser />
              ))}
            </div>
          )}
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary text-xs">
              صفحه قبل
            </button>
            <span className="flex items-center px-2 text-sm text-ink-500">صفحه {page}</span>
            <button onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs">
              صفحه بعد
            </button>
          </div>
        </>
      )}

      {tab === 'byUser' && (
        <div className="flex flex-col gap-4">
          <div className="card relative p-4">
            <label className="label flex items-center gap-1.5">
              <Search size={14} /> نام یا شماره موبایل کاربر را تایپ کنید
            </label>
            <input
              className="input"
              placeholder="مثلاً: رضا یا 0912..."
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setSelectedUser(null);
                setUserTickets(null);
              }}
            />
            {userSearch && !selectedUser && matchedUsers.length > 0 && (
              <div className="absolute inset-x-4 top-full z-10 mt-1 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg">
                {matchedUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => pickUser(u)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-right text-sm hover:bg-ink-50"
                  >
                    <span>{u.display_name}</span>
                    <span className="text-xs text-ink-400" dir="ltr">
                      {u.mobile} · #{u.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {searchingTickets ? (
            <Spinner />
          ) : userTickets && userTickets.length === 0 ? (
            <EmptyState title="تیکتی برای این کاربر یافت نشد" />
          ) : userTickets ? (
            <div className="card divide-y divide-ink-100">
              {userTickets.map((t) => (
                <TicketRow key={t.id} t={t} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
