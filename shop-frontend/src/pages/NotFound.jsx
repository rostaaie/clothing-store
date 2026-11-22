import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="text-6xl font-black text-brand-200">۴۰۴</span>
      <h1 className="text-xl font-bold text-ink-900">صفحه مورد نظر یافت نشد</h1>
      <Link to="/" className="btn-primary">
        بازگشت به خانه
      </Link>
    </div>
  );
}
