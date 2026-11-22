import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { BasketProvider } from './context/BasketContext';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';

import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/customer/Home';
import Products from './pages/customer/Products';
import ProductDetail from './pages/customer/ProductDetail';
import Categories from './pages/customer/Categories';
import Login from './pages/customer/Login';
import Register from './pages/customer/Register';
import RestoreAccount from './pages/customer/RestoreAccount';
import Profile from './pages/customer/Profile';
import Basket from './pages/customer/Basket';
import Checkout from './pages/customer/Checkout';
import Orders from './pages/customer/Orders';
import OrderDetail from './pages/customer/OrderDetail';
import Addresses from './pages/customer/Addresses';
import Wallet from './pages/customer/Wallet';
import Bookmarks from './pages/customer/Bookmarks';
import Tickets from './pages/customer/Tickets';
import TicketNew from './pages/customer/TicketNew';
import TicketThread from './pages/customer/TicketThread';
import NotFound from './pages/NotFound';

import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminOrders from './pages/admin/AdminOrders';
import AdminDiscountCodes from './pages/admin/AdminDiscountCodes';
import AdminTickets from './pages/admin/AdminTickets';
import AdminRestoreRequests from './pages/admin/AdminRestoreRequests';
import AdminUserWallet from './pages/admin/AdminUserWallet';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BasketProvider>
          <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Vazirmatn, sans-serif' } }} />
          <Routes>
            {/* پنل مشتری */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/categories/:id" element={<Categories />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/restore-account" element={<RestoreAccount />} />

              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/basket" element={<ProtectedRoute><Basket /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/tickets/new" element={<ProtectedRoute><TicketNew /></ProtectedRoute>} />
              <Route path="/tickets/:rootId" element={<ProtectedRoute><TicketThread /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Route>

            {/* پنل ادمین */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="wallet/:userId" element={<AdminUserWallet />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="discount-codes" element={<AdminDiscountCodes />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="restore-requests" element={<AdminRestoreRequests />} />
            </Route>
          </Routes>
        </BasketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
