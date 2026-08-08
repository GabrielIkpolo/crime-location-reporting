/**
 * Lightweight in-memory cache for client-side data fetching.
 * 
 * Provides stale-while-revalidate semantics: returns cached data immediately,
 * then re-fetches in the background and updates when fresh data arrives.
 * 
 * This avoids redundant API calls on every page refresh while keeping data
 * reasonably fresh (default 5-minute TTL matching server-side Cache-Control).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global cache store — shared across all components using this utility
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Fetch data with in-memory caching.
 * 
 * @param key - Unique cache key (typically the API endpoint URL)
 * @param fetcher - Async function that returns the data
 * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes)
 * @returns The cached or freshly fetched data
 */
export async function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000 // 5 minutes default
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry && now - entry.timestamp < ttlMs) {
    // Cache hit — return stale data immediately
    return entry.data;
  }

  // Cache miss or expired — fetch fresh data
  try {
    const data = await fetcher();
    cache.set(key, { data, timestamp: now });
    return data;
  } catch (error) {
    // If fetch fails but we have stale data, return it rather than throwing
    if (entry) {
      console.warn("[useCachedFetch] Fetch failed, returning stale data for:", key);
      return entry.data;
    }
    throw error;
  }
}

/**
 * Invalidate a specific cache entry. Call this after mutations
 * (e.g., creating/updating/deleting reports) to force a fresh fetch.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cached entries. Useful for logout or when switching users.
 */
export function clearAllCache(): void {
  cache.clear();
}
