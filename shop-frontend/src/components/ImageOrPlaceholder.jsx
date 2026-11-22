import { useEffect, useState } from 'react';
import { resolveImageUrl } from '../api/client';

/**
 * تصویر محصول/دسته‌بندی را نمایش می‌دهد؛ اگر imageUrl نبود یا لود نشد،
 * یک پلیس‌هولدر رنگی با حرف اول عنوان نشان داده می‌شود.
 */
export default function ImageOrPlaceholder({ src, letter, className = '', letterClassName = '' }) {
  const [errored, setErrored] = useState(false);
  const resolvedSrc = resolveImageUrl(src);

  // اگر src عوض شد (مثلا در فرم ادمین بعد از انتخاب فایل جدید)، وضعیت خطا ریست شود
  useEffect(() => setErrored(false), [resolvedSrc]);

  const showImage = resolvedSrc && !errored;

  if (showImage) {
    return (
      <img
        src={resolvedSrc}
        alt=""
        onError={() => setErrored(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-ink-50 ${className}`}>
      <span className={`select-none font-bold text-brand-200 ${letterClassName}`}>{letter?.slice(0, 1) || '?'}</span>
    </div>
  );
}
