interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * کش ساده In-Memory با TTL برای کاهش کوئری‌های تکراری.
 * هر کلید پس از انقضا حذف می‌شود (lazy eviction).
 */
export class UserCache {
  private store = new Map<string, CacheEntry<any>>();
  private readonly defaultTtl: number;

  constructor(defaultTtlMs: number = 300_000) {
    // پیش‌فرض: ۵ دقیقه
    this.defaultTtl = defaultTtlMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl),
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** حذف همه کلیدهایی که با یک پیشوند شروع می‌شوند */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

// کش سراسری برای کاربران ( TTL = 5 دقیقه )
export const userCache = new UserCache(300_000);
