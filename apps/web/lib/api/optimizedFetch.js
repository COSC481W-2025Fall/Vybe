/**
 * Optimized Fetch Layer
 * 
 * Features:
 * - Request deduplication (prevent duplicate in-flight requests)
 * - Response caching with TTL
 * - Automatic retry with exponential backoff
 * - Request queuing under high load
 * - Fallback responses
 */

import { SimpleCache } from '../utils/optimisticUpdates';

// In-flight request tracking (for deduplication)
const inFlightRequests = new Map();

// Response cache
const responseCache = new SimpleCache(30000); // 30 second default TTL

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 10000,
  REQUEST_TIMEOUT: 30000,
  CACHE_TTL: {
    groups: 30000,      // 30 seconds
    playlists: 30000,
    songs: 60000,       // 1 minute
    users: 120000,      // 2 minutes
    communities: 300000, // 5 minutes
  },
};

/**
 * Generate cache key from URL and options
 */
function getCacheKey(url, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Get TTL based on URL pattern
 */
function getTTL(url) {
  if (url.includes('/groups')) return CONFIG.CACHE_TTL.groups;
  if (url.includes('/playlists')) return CONFIG.CACHE_TTL.playlists;
  if (url.includes('/songs')) return CONFIG.CACHE_TTL.songs;
  if (url.includes('/users')) return CONFIG.CACHE_TTL.users;
  if (url.includes('/communities')) return CONFIG.CACHE_TTL.communities;
  return 30000;
}

/**
 * Optimized fetch with caching, deduplication, and retries
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} config - Additional configuration
 * @param {boolean} config.skipCache - Skip cache lookup
 * @param {boolean} config.skipDedup - Skip request deduplication
 * @param {number} config.retries - Number of retries
 * @param {Function} config.fallback - Fallback function if all retries fail
 */
export async function optimizedFetch(url, options = {}, config = {}) {
  const {
    skipCache = false,
    skipDedup = false,
    retries = CONFIG.MAX_RETRIES,
    fallback,
    cacheTTL,
  } = config;

  const cacheKey = getCacheKey(url, options);
  const method = options.method || 'GET';
  const isReadRequest = method === 'GET';

  // Check cache for GET requests
  if (isReadRequest && !skipCache) {
    const cached = responseCache.get(cacheKey);
    if (cached) {
      console.log(`[OptimizedFetch] Cache hit: ${url}`);
      return { ...cached, fromCache: true };
    }
  }

  // Check for duplicate in-flight request
  if (!skipDedup && inFlightRequests.has(cacheKey)) {
    console.log(`[OptimizedFetch] Deduplicating request: ${url}`);
    return inFlightRequests.get(cacheKey);
  }

  // Create the fetch promise with retry logic
  const fetchPromise = (async () => {
    let lastError;
    let delay = CONFIG.INITIAL_RETRY_DELAY;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || `HTTP ${response.status}`);
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Cache successful GET responses
        if (isReadRequest) {
          const ttl = cacheTTL || getTTL(url);
          responseCache.set(cacheKey, data, ttl);
        }

        return data;
      } catch (error) {
        lastError = error;
        
        // Don't retry on abort or client errors
        if (error.name === 'AbortError' || error.message.includes('HTTP 4')) {
          break;
        }

        if (attempt < retries) {
          console.log(`[OptimizedFetch] Retry ${attempt + 1}/${retries} for ${url}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, CONFIG.MAX_RETRY_DELAY);
        }
      }
    }

    // All retries failed - try fallback
    if (fallback) {
      console.log(`[OptimizedFetch] Using fallback for ${url}`);
      return fallback(lastError);
    }

    throw lastError;
  })();

  // Track in-flight request
  if (!skipDedup) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  }

  return fetchPromise;
}

/**
 * Invalidate cache for a specific pattern
 */
export function invalidateCache(pattern) {
  // For now, clear all cache (could be smarter with pattern matching)
  if (pattern) {
    console.log(`[OptimizedFetch] Invalidating cache for pattern: ${pattern}`);
  }
  responseCache.clear();
}

/**
 * Prefetch data into cache
 */
export async function prefetch(url, options = {}) {
  try {
    await optimizedFetch(url, options, { skipDedup: true });
    console.log(`[OptimizedFetch] Prefetched: ${url}`);
  } catch (error) {
    console.warn(`[OptimizedFetch] Prefetch failed: ${url}`, error);
  }
}

/**
 * Batch multiple requests
 */
export async function batchFetch(requests) {
  return Promise.all(
    requests.map(({ url, options, config }) =>
      optimizedFetch(url, options, config).catch(error => ({ error }))
    )
  );
}

/**
 * Stale-while-revalidate fetch
 * Returns cached data immediately (if available) while refreshing in background
 */
export async function swrFetch(url, options = {}, config = {}) {
  const cacheKey = getCacheKey(url, options);
  const cached = responseCache.get(cacheKey);

  // Return cached immediately and refresh in background
  if (cached) {
    // Refresh in background
    optimizedFetch(url, options, { ...config, skipCache: true }).catch(() => {});
    return { ...cached, fromCache: true, isRevalidating: true };
  }

  // No cache, fetch normally
  return optimizedFetch(url, options, config);
}

