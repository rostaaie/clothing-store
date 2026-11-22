import client from './client';

// این ماژول از unwrap استفاده نمی‌کند چون بک‌اند برای سفارشات
// گاهی مستقیم آبجکت نتیجه را برمی‌گرداند نه در قالب { data }
export const ordersApi = {
  myOrders: () => client.get('/orders/my-orders').then((r) => r.data),
  getOne: (id) => client.get(`/orders/${id}`).then((r) => r.data),
  create: (addressId, discountCode, paymentMethod = 'GATEWAY') =>
    client
      .post('/orders/create', { addressId, discountCode: discountCode || undefined, paymentMethod })
      .then((r) => r.data),
  requestPayment: (id) => client.post(`/orders/${id}/pay`).then((r) => r.data),
  payWithWallet: (id) => client.post(`/orders/${id}/pay-with-wallet`).then((r) => r.data),
  verify: (orderId, params) => client.get('/orders/verify', { params: { orderId, ...params } }).then((r) => r.data),
  cancel: (id) => client.post(`/orders/${id}/cancel`).then((r) => r.data),
  refund: (id, userId) => client.post(`/orders/${id}/refund`, { userId }).then((r) => r.data),
  // ادمین: لیست همه سفارش‌ها با صفحه‌بندی و فیلتر
  adminList: (params) => client.get('/orders', { params }).then((r) => r.data),
};
