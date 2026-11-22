export function formatPrice(value) {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString('fa-IR') + ' تومان';
}

export function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

export function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export const ORDER_STATUS_LABELS = {
  PENDING: 'در انتظار پرداخت',
  PAID: 'پرداخت‌شده',
  FAILED: 'ناموفق',
  CANCELED: 'لغو‌شده',
  REFUNDED: 'مسترد‌شده',
};

export const ORDER_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-ink-200 text-ink-600',
  REFUNDED: 'bg-blue-100 text-blue-700',
};
