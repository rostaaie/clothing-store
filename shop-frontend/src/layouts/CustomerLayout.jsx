import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-ink-100 bg-white py-6 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} فروشگاه آنلاین — همه حقوق محفوظ است
      </footer>
    </div>
  );
}
