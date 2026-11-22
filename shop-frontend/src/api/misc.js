import client, { unwrap } from './client';

export const discountApi = {
  list: () => client.get('/discount-codes').then(unwrap),
  get: (id) => client.get(`/discount-codes/${id}`).then(unwrap),
  create: (payload) => client.post('/discount-codes', payload).then(unwrap),
  update: (id, payload) => client.patch(`/discount-codes/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/discount-codes/${id}`).then(unwrap),
};

export const ticketApi = {
  myTickets: () => client.get('/ticket/my-tickets').then(unwrap),
  create: (payload) => client.post('/ticket', payload).then(unwrap),
  get: (id) => client.get(`/ticket/${id}`).then(unwrap),
  conversation: (rootId) => client.get(`/ticket/conversation/${rootId}`).then(unwrap),
  remove: (id) => client.delete(`/ticket/${id}`).then(unwrap),
  // ادمین
  all: (page = 1, limit = 10, id) => client.get('/ticket', { params: { page, limit, ...(id ? { id } : {}) } }).then(unwrap),
  threads: (page = 1, limit = 10, id) =>
    client.get('/ticket/threads', { params: { page, limit, ...(id ? { id } : {}) } }).then(unwrap),
  userTickets: (userId) => client.get(`/ticket/user/${userId}`).then(unwrap),
};

export const usersApi = {
  list: (params) => client.get('/users', { params }).then(unwrap),
  get: (id) => client.get(`/users/${id}`).then(unwrap),
  create: (payload) => client.post('/users', payload).then(unwrap),
  update: (id, payload) => client.put(`/users/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/users/${id}`).then(unwrap),
  restore: (id) => client.patch(`/users/${id}/restore`).then(unwrap),
};

// مدیریت درخواست‌های بازیابی حساب (فقط ادمین)
export const restoreRequestApi = {
  list: (status) => client.get('/restore-request', { params: status ? { status } : {} }).then(unwrap),
  // تأیید + بازگردانیِ واقعی حساب در یک اقدام
  approve: (id, note) => client.patch(`/restore-request/${id}/approve`, { note }).then(unwrap),
  updateStatus: (id, status, note) => client.patch(`/restore-request/${id}`, { status, note }).then(unwrap),
  remove: (id) => client.delete(`/restore-request/${id}`).then(unwrap),
};

// پروفایل خود کاربر لاگین‌شده (نه ادمین)
export const profileApi = {
  me: () => client.get('/users/me').then(unwrap),
  updateDisplayName: (display_name) => client.patch('/users/me', { display_name }).then(unwrap),
  changePassword: (currentPassword, newPassword) =>
    client.patch('/users/me/password', { currentPassword, newPassword }).then(unwrap),
};

export const recommenderApi = {
  similar: (productId) => client.get(`/recommender/similar/${productId}`).then(unwrap),
  boughtTogether: (productId) => client.get(`/recommender/bought-together/${productId}`).then(unwrap),
  forMe: () => client.get('/recommender/for-me').then(unwrap),
  topSelling: () => client.get('/recommender/top-selling').then(unwrap),
};
