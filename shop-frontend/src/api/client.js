import axios from 'axios';

// آدرس بک‌اند NestJS - در صورت نیاز از طریق .env قابل تغییر است
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const client = axios.create({
  baseURL: API_BASE_URL,
});
// نکته: عمداً هدر پیش‌فرض 'Content-Type: application/json' اینجا تنظیم نشده.
// axios به‌صورت خودکار برای آبجکت‌های معمولی JSON و برای FormData (آپلود فایل)
// نوع محتوای درست (با boundary صحیح multipart) را خودش تشخیص می‌دهد.
// اگر این هدر را ثابت روی application/json می‌ذاشتیم، آپلود فایل (FormData) خراب می‌شد.

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('user');
}

function redirectToLogin() {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// اجازه نمی‌دهیم چند درخواستِ موازیِ 401 با هم refresh بزنند؛ صف می‌شوند
let isRefreshing = false;
let refreshWaiters = [];

function notifyRefreshed(token) {
  refreshWaiters.forEach((w) => w(null, token));
  refreshWaiters = [];
}

function notifyRefreshFailed(error) {
  refreshWaiters.forEach((w) => w(error));
  refreshWaiters = [];
}

async function callRefreshEndpoint() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('refresh token not found');

  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const data = res.data?.data ?? res.data;
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('invalid refresh response');
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data.accessToken;
}

// با توکن تازه‌شده همان درخواستِ قبلی دوباره ارسال می‌شود
async function retryOriginalRequest(originalConfig) {
  const newToken = await callRefreshEndpoint();
  notifyRefreshed(newToken);
  originalConfig.headers.Authorization = `Bearer ${newToken}`;
  return client(originalConfig);
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalConfig = error.config;
    const status = error.response?.status;
    const isRefreshEndpoint = originalConfig?.url?.includes('/auth/refresh');
    // این‌ها عمومی‌اند؛ 401 یعنی ورود/ثبت‌نام ناموفق، نه توکن منقضی
    const isPublicAuth =
      originalConfig?.url?.includes('/auth/login') ||
      originalConfig?.url?.includes('/auth/register');

    if (isRefreshEndpoint && status === 401) {
      // خودِ refresh جواب نداده → نشست بی‌اعتبار است
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isPublicAuth || status !== 401 || originalConfig?._retry) {
      return Promise.reject(error);
    }

    if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshWaiters.push((refreshError, token) => {
          if (refreshError) return reject(refreshError);
          originalConfig.headers.Authorization = `Bearer ${token}`;
          resolve(client(originalConfig));
        });
      });
    }

    isRefreshing = true;
    try {
      return await retryOriginalRequest(originalConfig);
    } catch (refreshError) {
      notifyRefreshFailed(refreshError);
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

// بک‌اند گاهی پاسخ را در قالب { statusCode, data, message } برمی‌گرداند
// و گاهی مستقیم آبجکت را برمی‌گرداند (مثل orders). این تابع هر دو حالت را یکسان می‌کند.
export function unwrap(res) {
  const body = res.data;
  if (body && typeof body === 'object' && 'data' in body && 'statusCode' in body) {
    return body.data;
  }
  return body;
}

export function getErrorMessage(error) {
  const msg = error?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' - ');
  if (typeof msg === 'string') return msg;
  return 'خطایی رخ داد. لطفا دوباره تلاش کنید.';
}

// آیا خطای دریافتی از بک‌اند نشان می‌دهد که این شماره متعلق به یک حساب غیرفعال
// (حذف‌شده) است و کاربر باید «درخواست بازیابی حساب» ثبت کند؟ (دکمه فقط در این حالت نمایش داده شود)
export function isAccountNeedsRestore(error) {
  return error?.response?.data?.code === 'ACCOUNT_NEEDS_RESTORE';
}

// عکس‌های آپلودشده در بک‌اند به‌صورت مسیر نسبی مثل /uploads/products/x.jpg برمی‌گردند
// که باید به آدرس بک‌اند (نه فرانت) اضافه شوند. لینک‌های کامل (http...) و blob: دست‌نخورده می‌مانند.
export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

export default client;
