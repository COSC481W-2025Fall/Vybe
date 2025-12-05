'use client';

/**
 * useOptimizedData - High-performance data fetching hook
 * 
 * Features:
 * - Stale-while-revalidate pattern
 * - Optimistic updates
 * - Real-time subscriptions with fallback polling
 * - Automatic retry with exponential backoff
 * - Memory-efficient caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtime } from '../realtime/RealtimeProvider';
import { globalCache } from '../utils/optimisticUpdates';

const DEFAULT_OPTIONS = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  refreshInterval: 0, // 0 = disabled
  fallbackData: null,
  cacheTime: 60000, // 1 minute
};

/**
 * Main data fetching hook with optimizations
 */
export function useOptimizedData(key, fetcher, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [data, setData] = useState(opts.fallbackData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!opts.fallbackData);
  const [isValidating, setIsValidating] = useState(false);
  
  const { isConnected } = useRealtime();
  const fetcherRef = useRef(fetcher);
  const retryCount = useRef(0);
  const lastFetchTime = useRef(0);

  // Keep fetcher ref updated
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Main fetch function
  const fetchData = useCallback(async (shouldRevalidate = false) => {
    if (!key) return;

    const now = Date.now();

    // Deduping - prevent rapid refetches
    if (!shouldRevalidate && now - lastFetchTime.current < opts.dedupingInterval) {
      return;
    }

    // Check cache first
    const cached = globalCache.get(key);
    if (cached && !shouldRevalidate) {
      setData(cached);
      setIsLoading(false);
      // Still revalidate in background
      setIsValidating(true);
    }

    lastFetchTime.current = now;

    try {
      const result = await fetcherRef.current();
      
      // Update state
      setData(result);
      setError(null);
      setIsLoading(false);
      setIsValidating(false);
      retryCount.current = 0;

      // Cache result
      globalCache.set(key, result, opts.cacheTime);

      return result;
    } catch (err) {
      console.error(`[useOptimizedData] Error fetching ${key}:`, err);
      
      // Retry logic
      if (retryCount.current < opts.errorRetryCount) {
        retryCount.current++;
        setTimeout(() => {
          fetchData(true);
        }, opts.errorRetryInterval * retryCount.current);
      } else {
        setError(err);
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [key, opts.dedupingInterval, opts.cacheTime, opts.errorRetryCount, opts.errorRetryInterval]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [key, fetchData]);

  // Revalidate on focus
  useEffect(() => {
    if (!opts.revalidateOnFocus || typeof window === 'undefined') return;

    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [opts.revalidateOnFocus, fetchData]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!opts.revalidateOnReconnect || typeof window === 'undefined') return;

    const handleOnline = () => {
      fetchData(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [opts.revalidateOnReconnect, fetchData]);

  // Periodic refresh
  useEffect(() => {
    if (!opts.refreshInterval) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, opts.refreshInterval);

    return () => clearInterval(interval);
  }, [opts.refreshInterval, fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData, shouldRevalidate = true) => {
    if (typeof newData === 'function') {
      setData(prev => {
        const updated = newData(prev);
        globalCache.set(key, updated, opts.cacheTime);
        return updated;
      });
    } else {
      setData(newData);
      globalCache.set(key, newData, opts.cacheTime);
    }

    if (shouldRevalidate) {
      fetchData(true);
    }
  }, [key, opts.cacheTime, fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    isConnected,
    mutate,
    refetch: () => fetchData(true),
  };
}

/**
 * Hook for fetching list data with pagination
 */
export function useOptimizedList(key, fetcher, options = {}) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  
  const { data, error, isLoading, isValidating, mutate, refetch } = useOptimizedData(
    key ? `${key}-page-${page}` : null,
    () => fetcher(page),
    options
  );

  useEffect(() => {
    if (data) {
      if (page === 0) {
        setItems(data.items || data);
      } else {
        setItems(prev => [...prev, ...(data.items || data)]);
      }
      setHasMore(data.hasMore ?? (data.length > 0));
    }
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isLoading, hasMore]);

  const reset = useCallback(() => {
    setPage(0);
    setItems([]);
    setHasMore(true);
  }, []);

  return {
    items,
    error,
    isLoading,
    isValidating,
    hasMore,
    loadMore,
    reset,
    mutate: (fn) => {
      setItems(prev => typeof fn === 'function' ? fn(prev) : fn);
    },
    refetch: () => {
      reset();
      refetch();
    },
  };
}

/**
 * Hook for real-time data with automatic fallback
 */
export function useRealtimeData(key, fetcher, realtimeConfig, options = {}) {
  const base = useOptimizedData(key, fetcher, options);
  const { subscribe, connectionState } = useRealtime();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!realtimeConfig || connectionState !== 'connected') return;

    const unsub = subscribe({
      ...realtimeConfig,
      callback: (payload) => {
        // Handle real-time update
        if (payload.eventType === 'INSERT') {
          base.mutate(prev => prev ? [...prev, payload.new] : [payload.new], false);
        } else if (payload.eventType === 'UPDATE') {
          base.mutate(prev => {
            if (!prev) return prev;
            if (Array.isArray(prev)) {
              return prev.map(item => item.id === payload.new.id ? payload.new : item);
            }
            return payload.new;
          }, false);
        } else if (payload.eventType === 'DELETE') {
          base.mutate(prev => {
            if (!prev) return prev;
            if (Array.isArray(prev)) {
              return prev.filter(item => item.id !== payload.old.id);
            }
            return null;
          }, false);
        }
      },
    });

    return unsub;
  }, [realtimeConfig, connectionState, subscribe, base]);

  // Fallback to polling when disconnected
  useEffect(() => {
    if (connectionState === 'connected' || !options.fallbackPollingInterval) return;

    const interval = setInterval(() => {
      base.refetch();
    }, options.fallbackPollingInterval);

    return () => clearInterval(interval);
  }, [connectionState, options.fallbackPollingInterval, base]);

  return {
    ...base,
    connectionState,
    isRealtime: connectionState === 'connected',
  };
}

