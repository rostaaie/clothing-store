import client, { unwrap } from './client';

export const basketApi = {
  list: () => client.get('/basket-items').then(unwrap),
  add: (productId, quantity, variantId) => client.post('/basket-items', { productId, quantity, variantId }).then(unwrap),
  remove: (productId, variantId) =>
    client.delete(`/basket-items/${productId}`, { params: variantId ? { variantId } : undefined }).then(unwrap),
  // ادمین: مشاهده سبد خرید یک کاربر خاص (فقط جهت پشتیبانی)
  adminUserBasket: (userId) => client.get(`/basket-items/user/${userId}`).then(unwrap),
};
