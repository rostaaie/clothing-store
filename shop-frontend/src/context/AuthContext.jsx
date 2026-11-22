import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded) {
        setUser({ id: decoded.sub, mobile: decoded.mobile, display_name: decoded.display_name, role: decoded.role });
      } else {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (mobile, password) => {
    const data = await authApi.login({ mobile, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const decoded = decodeJwt(data.accessToken);
    const u = { id: decoded.sub, mobile: decoded.mobile, display_name: decoded.display_name, role: decoded.role };
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (mobile, password, display_name) => {
    await authApi.register({ mobile, password, display_name });
    return login(mobile, password);
  }, [login]);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // بعد از ویرایش موفق پروفایل، نام نمایشی را در state هم به‌روزرسانی می‌کند
  // (توکن JWT فعلی همچنان معتبر است، فقط payload قدیمی دارد)
  const updateLocalDisplayName = useCallback((display_name) => {
    setUser((u) => (u ? { ...u, display_name } : u));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateLocalDisplayName, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  return ctx;
}
