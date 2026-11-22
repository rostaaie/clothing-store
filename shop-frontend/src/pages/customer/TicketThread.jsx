import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { ticketApi } from '../../api/misc';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import toast from 'react-hot-toast';

export default function TicketThread() {
  const { rootId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    ticketApi
      .conversation(rootId)
      .then((d) => setMessages(Array.isArray(d) ? d : []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [rootId]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const last = messages[messages.length - 1] || messages[0];
      await ticketApi.create({
        title: `پاسخ: ${last?.title || ''}`.slice(0, 100),
        subject: last?.subject || 'پاسخ تیکت',
        description: reply.trim(),
        replyToId: last?.id,
      });
      setReply('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (messages.length === 0) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900">{messages[0]?.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{messages[0]?.subject}</p>
      </div>

      <div className="flex flex-col gap-3">
        {messages.map((m) => {
          const isMine = String(m.userId) === String(user?.id);
          return (
            <div key={m.id} className={`max-w-[85%] rounded-2xl p-4 ${isMine ? 'self-end bg-brand-500 text-white' : 'self-start bg-white border border-ink-100'}`}>
              <p className="whitespace-pre-line text-sm leading-relaxed">{m.description}</p>
              <p className={`mt-2 text-[11px] ${isMine ? 'text-brand-100' : 'text-ink-400'}`}>{formatDateTime(m.createdAt)}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleReply} className="card flex items-center gap-2 p-2">
        <input
          className="input flex-1 border-0 focus:ring-0"
          placeholder="پاسخ خود را بنویسید..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button type="submit" disabled={sending} className="btn-primary shrink-0">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
