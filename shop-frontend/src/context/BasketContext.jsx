import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { basketApi } from '../api/basket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const BasketContext = createContext(null);

export function BasketProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await basketApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // نادیده گرفتن خطای بارگذاری سبد
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId, quantity = 1, variantId) => {
    if (!user) {
      toast.error('برای افزودن به سبد خرید ابتدا وارد شوید');
      throw new Error('not authenticated');
    }
    await basketApi.add(productId, quantity, variantId);
    await refresh();
    toast.success('به سبد خرید اضافه شد');
  }, [user, refresh]);

  const removeItem = useCallback(async (productId, variantId) => {
    await basketApi.remove(productId, variantId);
    await refresh();
  }, [refresh]);

  const count = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

  return (
    <BasketContext.Provider value={{ items, loading, count, refresh, addItem, removeItem }}>
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket باید داخل BasketProvider استفاده شود');
  return ctx;
}
