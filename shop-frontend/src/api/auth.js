import client, { unwrap } from './client';

export const authApi = {
  register: (payload) => client.post('/auth/register', payload).then(unwrap),
  login: (payload) => client.post('/auth/login', payload).then(unwrap),
  logout: (refreshToken) => client.post('/auth/logout', { refreshToken }).then(unwrap),
  // ثبت درخواست بازیابی حساب غیرفعال‌شده (بدون نیاز به لاگین، فقط با شماره موبایل)
  requestRestore: (mobile) => client.post('/restore-request', { mobile }).then(unwrap),
};
