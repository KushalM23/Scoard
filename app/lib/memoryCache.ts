/**
 * In-Memory Cache Module
 * 
 * Provides fast server-side caching with TTL (Time To Live) support.
 * This reduces NBA API calls by caching data in server memory.
 * 
 * Cache hits are instant (no network call), significantly improving response times.
 */

interface CacheEntry<T> {
    data: T;
    expiry: number;
    createdAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Cache statistics
let hits = 0;
let misses = 0;

/**
 * Retrieves data from the cache if it exists and hasn't expired.
 * 
 * @param key - Unique cache key
 * @returns Cached data or null if not found/expired
 */
export function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    
    if (!entry) {
        misses++;
        return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiry) {
        console.log(`[Cache] Expired: ${key} (age: ${Math.round((Date.now() - entry.createdAt) / 1000)}s)`);
        cache.delete(key);
        misses++;
        return null;
    }
    
    hits++;
    const age = Math.round((Date.now() - entry.createdAt) / 1000);
    console.log(`[Cache] HIT: ${key} (age: ${age}s, remaining: ${Math.round((entry.expiry - Date.now()) / 1000)}s)`);
    return entry.data;
}

/**
 * Stores data in the cache with a TTL.
 * 
 * @param key - Unique cache key
 * @param data - Data to cache
 * @param ttlMs - Time to live in milliseconds
 */
export function setCached<T>(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    cache.set(key, {
        data,
        expiry: now + ttlMs,
        createdAt: now
    });
    console.log(`[Cache] SET: ${key} (TTL: ${Math.round(ttlMs / 1000)}s)`);
}

/**
 * Manually invalidate a cache entry
 */
export function invalidate(key: string): boolean {
    return cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAll(): void {
    cache.clear();
    hits = 0;
    misses = 0;
    console.log('[Cache] Cleared all entries');
}

/**
 * Get cache statistics
 */
export function getStats() {
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';
    
    return {
        size: cache.size,
        hits,
        misses,
        total,
        hitRate: `${hitRate}%`
    };
}

/**
 * Cleanup expired entries periodically
 * Runs every minute to prevent memory bloat
 */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiry) {
            cache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries. Current size: ${cache.size}`);
    }
}, 60000); // Every minute

// Log cache stats every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const stats = getStats();
        console.log('[Cache] Stats:', stats);
    }, 300000);
}
