import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Tags, Users, Percent, Ticket, ArrowLeft } from 'lucide-react';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { usersApi, discountApi } from '../../api/misc';
import Spinner from '../../components/Spinner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [products, categories, users, discounts] = await Promise.allSettled([
        productsApi.list(),
        categoriesApi.list(),
        usersApi.list({ limit: 1000, page: 1 }),
        discountApi.list(),
      ]);
      setStats({
        products: products.status === 'fulfilled' ? products.value.length : '-',
        categories: categories.status === 'fulfilled' ? categories.value.length : '-',
        users: users.status === 'fulfilled' ? (Array.isArray(users.value) ? users.value.length : '-') : '-',
        discounts: discounts.status === 'fulfilled' ? discounts.value.length : '-',
      });
    })();
  }, []);

  if (!stats) return <Spinner />;

  const cards = [
    { label: 'محصولات', value: stats.products, icon: Package, to: '/admin/products', color: 'bg-brand-500' },
    { label: 'دسته‌بندی‌ها', value: stats.categories, icon: Tags, to: '/admin/categories', color: 'bg-blue-500' },
    { label: 'کاربران', value: stats.users, icon: Users, to: '/admin/users', color: 'bg-emerald-500' },
    { label: 'کدهای تخفیف', value: stats.discounts, icon: Percent, to: '/admin/discount-codes', color: 'bg-purple-500' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-ink-900">داشبورد مدیریت</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card flex flex-col gap-3 p-5 hover:shadow-md">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${c.color}`}>
              <c.icon size={19} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink-900">{c.value}</p>
              <p className="text-sm text-ink-500">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <h2 className="font-bold text-ink-900">راهنمای سریع</h2>
        <p className="text-sm leading-relaxed text-ink-600">
          از منوی سمت راست می‌توانید محصولات، دسته‌بندی‌ها، کاربران، سفارش‌ها، کدهای تخفیف و تیکت‌های پشتیبانی را مدیریت کنید.
          توجه داشته باشید که API فعلی بک‌اند، لیست کامل سفارش‌ها را برنمی‌گرداند و برای مشاهده هر سفارش باید شناسه آن را وارد کنید.
        </p>
        <Link to="/tickets" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          بازگشت به فروشگاه <ArrowLeft size={14} />
        </Link>
      </div>
    </div>
  );
}
