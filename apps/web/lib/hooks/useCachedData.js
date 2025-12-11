'use client';

/**
 * useCachedData - React hook for data fetching with persistent client-side caching
 * 
 * Features:
 * - Returns cached data immediately (from localStorage)
 * - Revalidates in background if stale
 * - Optimistic updates
 * - Automatic retry with backoff
 * - Works offline with cached data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getCache, 
  setCache, 
  isCacheStale, 
  CACHE_TTL 
} from '../cache/clientCache';

const DEFAULT_OPTIONS = {
  ttl: CACHE_TTL.USER_PROFILE,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateOnMount: true,
  dedupingInterval: 2000,
  retryCount: 2,
  retryDelay: 1000,
  onSuccess: null,
  onError: null,
};

/**
 * Main hook for cached data fetching
 * 
 * @param {string} key - Unique cache key
 * @param {Function} fetcher - Async function to fetch data
 * @param {Object} options - Configuration options
 * @returns {Object} { data, error, isLoading, isValidating, mutate, refetch }
 */
export function useCachedData(key, fetcher, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Initialize with cached data if available
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getCache(key, { allowStale: true });
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return getCache(key, { allowStale: true }) === null;
  });
  const [isValidating, setIsValidating] = useState(false);
  
  const fetcherRef = useRef(fetcher);
  const retryCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const isMountedRef = useRef(true);

  // Keep fetcher ref updated
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Main fetch function
  const fetchData = useCallback(async (shouldRevalidate = false) => {
    if (!key || !fetcherRef.current) return;

    const now = Date.now();

    // Deduping - prevent rapid refetches
    if (!shouldRevalidate && now - lastFetchTimeRef.current < opts.dedupingInterval) {
      return;
    }

    lastFetchTimeRef.current = now;

    // Check if we already have data (from cache)
    const hasExistingData = data !== null;
    
    if (hasExistingData) {
      setIsValidating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await fetcherRef.current();
      
      if (!isMountedRef.current) return;

      // Update state
      setData(result);
      setError(null);
      setIsLoading(false);
      setIsValidating(false);
      retryCountRef.current = 0;

      // Cache result
      setCache(key, result, opts.ttl);

      // Success callback
      if (opts.onSuccess) {
        opts.onSuccess(result);
      }

      return result;
    } catch (err) {
      console.error(`[useCachedData] Error fetching ${key}:`, err);
      
      if (!isMountedRef.current) return;

      // Retry logic
      if (retryCountRef.current < opts.retryCount) {
        retryCountRef.current++;
        const delay = opts.retryDelay * Math.pow(2, retryCountRef.current - 1);
        setTimeout(() => {
          fetchData(true);
        }, delay);
        return;
      }

      // Final failure
      setError(err);
      setIsLoading(false);
      setIsValidating(false);

      // Error callback
      if (opts.onError) {
        opts.onError(err);
      }
    }
  }, [key, data, opts.dedupingInterval, opts.ttl, opts.retryCount, opts.retryDelay, opts.onSuccess, opts.onError]);

  // Initial fetch on mount
  useEffect(() => {
    if (!key) return;

    // Check if cache is stale
    const cached = getCache(key, { allowStale: true });
    const stale = isCacheStale(key);

    if (cached !== null) {
      setData(cached);
      setIsLoading(false);
      
      // Revalidate if stale and allowed
      if (stale && opts.revalidateOnMount) {
        setIsValidating(true);
        fetchData(true);
      }
    } else if (opts.revalidateOnMount) {
      fetchData();
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revalidate on window focus
  useEffect(() => {
    if (!opts.revalidateOnFocus || typeof window === 'undefined') return;

    const handleFocus = () => {
      if (isCacheStale(key)) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, opts.revalidateOnFocus, fetchData]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!opts.revalidateOnReconnect || typeof window === 'undefined') return;

    const handleOnline = () => {
      fetchData(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [opts.revalidateOnReconnect, fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData, shouldRevalidate = false) => {
    if (typeof newData === 'function') {
      setData(prev => {
        const updated = newData(prev);
        setCache(key, updated, opts.ttl);
        return updated;
      });
    } else {
      setData(newData);
      setCache(key, newData, opts.ttl);
    }

    if (shouldRevalidate) {
      fetchData(true);
    }
  }, [key, opts.ttl, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    isStale: isCacheStale(key),
    mutate,
    refetch: () => fetchData(true),
  };
}

/**
 * Hook for user's groups with caching
 */
export function useCachedGroups(fetcher) {
  return useCachedData('user_groups', fetcher, {
    ttl: CACHE_TTL.USER_GROUPS,
  });
}

/**
 * Hook for user's friends with caching
 */
export function useCachedFriends(fetcher) {
  return useCachedData('user_friends', fetcher, {
    ttl: CACHE_TTL.USER_FRIENDS,
  });
}

/**
 * Hook for group details with caching
 */
export function useCachedGroupDetails(groupId, fetcher) {
  return useCachedData(`group_${groupId}`, fetcher, {
    ttl: CACHE_TTL.GROUP_DETAILS,
  });
}

/**
 * Hook for playlist songs with caching
 */
export function useCachedPlaylistSongs(playlistId, fetcher) {
  return useCachedData(`playlist_${playlistId}`, fetcher, {
    ttl: CACHE_TTL.PLAYLIST_SONGS,
  });
}

export default useCachedData;
