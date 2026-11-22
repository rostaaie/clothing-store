import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  ShoppingCart, User, Menu, X, LogOut, Wallet, MapPin,
  Ticket, Heart, Search, ChevronDown, Store, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBasket } from '../context/BasketContext';
import { categoriesApi } from '../api/categories';
import { buildCategoryTree } from '../utils/categoryTree';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { count } = useBasket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const navigate = useNavigate();
  const catTimeoutRef = useRef(null);
  const catRef = useRef(null);

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => {
        const categories = Array.isArray(data) ? data : [];
        setCategoryTree(buildCategoryTree(categories));
      })
      .catch(() => setCategoryTree([]));
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const openCat = () => {
    clearTimeout(catTimeoutRef.current);
    setCatOpen(true);
  };

  const closeCat = () => {
    clearTimeout(catTimeoutRef.current);
    catTimeoutRef.current = setTimeout(() => setCatOpen(false), 150);
  };

  useEffect(() => () => clearTimeout(catTimeoutRef.current), []);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-orange-600">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-sm">
            <Store size={18} />
          </span>
          <span className="hidden sm:inline">فروشگاه</span>
        </Link>

        {/* Category dropdown trigger */}
        <div
          ref={catRef}
          className="relative hidden md:block"
          onMouseEnter={openCat}
          onMouseLeave={closeCat}
        >
          <button
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              catOpen ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            <Menu size={16} />
            دسته‌بندی‌ها
            <ChevronDown size={13} className={`transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
          </button>
          {catOpen && (
            <div
              className="absolute right-0 top-full z-50 pt-2"
              onMouseEnter={openCat}
              onMouseLeave={closeCat}
            >
              <div className="w-56 rounded-xl border border-gray-100 bg-white shadow-lg">
                <CategoryMegaMenu categories={categoryTree} />
              </div>
            </div>
          )}
        </div>

        {/* Root categories as inline links (پوشاک مردانه / پوشاک زنانه) */}
        {categoryTree.length > 0 && (
          <nav className="hidden items-center gap-0.5 lg:flex">
            {categoryTree.map((root) => (
              <Link
                key={root.id}
                to={`/categories/${root.id}`}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
              >
                {root.title}
              </Link>
            ))}
          </nav>
        )}

        {/* Search bar */}
        <div className="hidden flex-1 md:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.target).get('q');
              if (q?.trim()) navigate(`/products?search=${encodeURIComponent(q.trim())}`);
            }}
            className="relative"
          >
            <input
              name="q"
              type="text"
              placeholder="جستجوی محصولات..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:bg-white focus:shadow-sm"
            />
            <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </form>
        </div>

        {/* Left actions */}
        <div className="flex items-center gap-1">
          {/* Admin panel */}
          {user && isAdmin && (
            <Link
              to="/admin"
              className="hidden rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-amber-50 hover:text-amber-600 sm:flex"
              title="پنل ادمین"
            >
              <LayoutDashboard size={19} />
            </Link>
          )}

          {/* Cart */}
          <Link
            to="/basket"
            className="relative rounded-xl p-2.5 text-gray-700 transition-colors hover:bg-gray-100"
          >
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -left-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white ring-2 ring-white">
                {count}
              </span>
            )}
          </Link>

          {/* User */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <User size={18} />
                <span className="hidden max-w-[80px] truncate sm:inline">{user.display_name}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                    <UserMenuItem to="/profile" icon={<User size={16} />} onClick={() => setMenuOpen(false)}>
                      پروفایل
                    </UserMenuItem>
                    <UserMenuItem to="/orders" icon={<ShoppingCart size={16} />} onClick={() => setMenuOpen(false)}>
                      سفارش‌ها
                    </UserMenuItem>
                    <UserMenuItem to="/wallet" icon={<Wallet size={16} />} onClick={() => setMenuOpen(false)}>
                      کیف پول
                    </UserMenuItem>
                    <UserMenuItem to="/addresses" icon={<MapPin size={16} />} onClick={() => setMenuOpen(false)}>
                      آدرس‌ها
                    </UserMenuItem>
                    <UserMenuItem to="/bookmarks" icon={<Heart size={16} />} onClick={() => setMenuOpen(false)}>
                      نشانه‌ها
                    </UserMenuItem>
                    <UserMenuItem to="/tickets" icon={<Ticket size={16} />} onClick={() => setMenuOpen(false)}>
                      تیکت‌ها
                    </UserMenuItem>
                    <div className="border-t border-gray-100">
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut size={16} /> خروج
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-orange-600"
            >
              ورود
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="rounded-xl p-2.5 text-gray-700 transition-colors hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="منو"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 w-72 animate-slideIn border-l border-gray-100 bg-white shadow-xl md:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-lg font-extrabold text-orange-600">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white">S</span>
                  فروشگاه
                </Link>
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-gray-100 px-4 py-3">
                <form onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.target).get('q'); if (q?.trim()) { navigate(`/products?search=${encodeURIComponent(q.trim())}`); setMobileOpen(false); } }}>
                  <div className="relative">
                    <input name="q" type="text" placeholder="جستجوی محصولات..." className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 pr-9 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-orange-400 focus:bg-white" />
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </form>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-3">
                <div className="mb-1 px-2 text-xs font-bold text-gray-400">دسته‌بندی‌ها</div>
                {categoryTree.map((root) => (
                  <MobileCategoryAccordion key={root.id} category={root} onNavigate={() => setMobileOpen(false)} />
                ))}

                <div className="mb-1 mt-4 px-2 text-xs font-bold text-gray-400">سایر</div>
                <MobileLink to="/products" onClick={() => setMobileOpen(false)}>همه محصولات</MobileLink>
                <MobileLink to="/basket" onClick={() => setMobileOpen(false)}>سبد خرید {count > 0 && `(${count})`}</MobileLink>
              </nav>

              <div className="border-t border-gray-100 px-4 py-3">
                {user ? (
                  <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={16} /> خروج از حساب
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block rounded-xl bg-orange-500 py-2 text-center text-sm font-medium text-white">
                    ورود / ثبت‌نام
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

/* ==================== Sub-components ==================== */

function UserMenuItem({ to, icon, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700">
      <span className="text-gray-400">{icon}</span>
      {children}
    </Link>
  );
}

function MobileLink({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600">
      {children}
    </Link>
  );
}

/* ==================== Category Mega Menu (flyout) ==================== */

function CategoryMegaMenu({ categories }) {
  if (!categories?.length) return null;

  return (
    <ul className="py-1">
      {categories.map((cat) => (
        <CategoryFlyoutItem key={cat.id} category={cat} />
      ))}
    </ul>
  );
}

function CategoryFlyoutItem({ category }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);
  const hasChildren = category.children?.length > 0;

  const open = () => {
    clearTimeout(timeoutRef.current);
    setShow(true);
  };

  const close = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 150);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <li
      className="relative"
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <Link
        to={`/categories/${category.id}`}
        className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
      >
        <span>{category.title}</span>
        {hasChildren && <ChevronDown size={12} className="-rotate-90 text-gray-400" />}
      </Link>
      {hasChildren && show && (
        <div
          className="absolute right-full top-0 z-50 mr-1"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <div className="w-52 rounded-xl border border-gray-100 bg-white shadow-lg">
            <CategoryMegaMenu categories={category.children} />
          </div>
        </div>
      )}
    </li>
  );
}

/* ==================== Mobile Accordion ==================== */

function MobileCategoryAccordion({ category, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children?.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between rounded-lg transition-colors hover:bg-orange-50">
        <Link to={`/categories/${category.id}`} onClick={onNavigate} className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-700">
          {category.title}
        </Link>
        {hasChildren && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-3 py-2.5 text-gray-400 hover:text-orange-600"
            aria-label={expanded ? 'بستن' : 'باز کردن'}
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="mr-3 border-r-2 border-orange-100 pr-2">
          {category.children.map((child) => (
            <MobileCategoryAccordion key={child.id} category={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}
