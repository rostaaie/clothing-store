import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, Users, ShoppingBag, Percent, Ticket, ArrowRight, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin', label: 'داشبورد', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'محصولات', icon: Package },
  { to: '/admin/categories', label: 'دسته‌بندی‌ها', icon: Tags },
  { to: '/admin/users', label: 'کاربران', icon: Users },
  { to: '/admin/orders', label: 'سفارش‌ها', icon: ShoppingBag },
  { to: '/admin/discount-codes', label: 'کدهای تخفیف', icon: Percent },
  { to: '/admin/tickets', label: 'تیکت‌های پشتیبانی', icon: Ticket },
  { to: '/admin/restore-requests', label: 'درخواست بازیابی حساب', icon: RotateCcw },
];

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-64 shrink-0 flex-col border-l border-ink-100 bg-ink-950 text-ink-100 md:flex">
        <div className="flex items-center gap-2 px-5 py-5 text-lg font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">⚙</span>
          پنل مدیریت
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-ink-300 hover:bg-ink-900 hover:text-white'
                }`
              }
            >
              <l.icon size={17} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-800 p-3">
          <Link to="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-300 hover:bg-ink-900 hover:text-white">
            <ArrowRight size={17} />
            بازگشت به فروشگاه
          </Link>
          <div className="mt-1 px-3 py-1 text-xs text-ink-500">{user?.display_name}</div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
