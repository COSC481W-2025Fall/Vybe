/**
 * Settings Cache Strategy
 * 
 * Optimizes settings loading with smart caching using TanStack Query.
 * Features:
 * - Cache settings in memory using TanStack Query
 * - Set appropriate stale time (5 minutes for settings)
 * - Prefetch settings on app load
 * - Cache invalidation strategies
 * - Fallback to stale cache if API fails
 * - Background refetch on window focus
 */

import { QueryClient } from '@tanstack/react-query';

// Cache configuration constants
export const SETTINGS_CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes (keep in cache)
  REFETCH_ON_WINDOW_FOCUS: true,
  REFETCH_ON_MOUNT: false, // Don't refetch if we have cached data
  RETRY: 1, // Retry once on failure
  RETRY_DELAY: 1000, // 1 second delay
};

// Query keys for settings
export const SETTINGS_QUERY_KEYS = {
  profile: ['profile'],
  privacy: ['privacy'],
  notifications: ['notificationPreferences'],
  all: ['profile', 'privacy', 'notificationPreferences'],
};

/**
 * Get query options for settings queries
 * @param {Object} options - Query options
 * @returns {Object} TanStack Query options
 */
export function getSettingsQueryOptions(options = {}) {
  return {
    staleTime: SETTINGS_CACHE_CONFIG.STALE_TIME,
    gcTime: SETTINGS_CACHE_CONFIG.CACHE_TIME, // Previously cacheTime in v4
    refetchOnWindowFocus: SETTINGS_CACHE_CONFIG.REFETCH_ON_WINDOW_FOCUS,
    refetchOnMount: options.refetchOnMount ?? SETTINGS_CACHE_CONFIG.REFETCH_ON_MOUNT,
    retry: SETTINGS_CACHE_CONFIG.RETRY,
    retryDelay: SETTINGS_CACHE_CONFIG.RETRY_DELAY,
    // Fallback to stale cache if API fails
    placeholderData: (previousData) => previousData,
    ...options,
  };
}

/**
 * Prefetch all settings on app load
 * @param {QueryClient} queryClient - TanStack Query client
 * @returns {Promise} Promise that resolves when prefetch completes
 */
export async function prefetchSettings(queryClient) {
  try {
    console.log('[settings cache] Prefetching all settings...');

    const prefetchPromises = [
      prefetchProfile(queryClient),
      prefetchPrivacy(queryClient),
      prefetchNotifications(queryClient),
    ];

    await Promise.allSettled(prefetchPromises);
    
    console.log('[settings cache] Prefetch completed');
  } catch (error) {
    console.error('[settings cache] Error prefetching settings:', error);
  }
}

/**
 * Prefetch profile settings
 * @param {QueryClient} queryClient - TanStack Query client
 */
export async function prefetchProfile(queryClient) {
  await queryClient.prefetchQuery({
    queryKey: SETTINGS_QUERY_KEYS.profile,
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return await response.json();
    },
    ...getSettingsQueryOptions(),
  });
}

/**
 * Prefetch privacy settings
 * @param {QueryClient} queryClient - TanStack Query client
 */
export async function prefetchPrivacy(queryClient) {
  await queryClient.prefetchQuery({
    queryKey: SETTINGS_QUERY_KEYS.privacy,
    queryFn: async () => {
      const response = await fetch('/api/user/privacy');
      if (!response.ok) {
        throw new Error('Failed to fetch privacy settings');
      }
      return await response.json();
    },
    ...getSettingsQueryOptions(),
  });
}

/**
 * Prefetch notification preferences
 * @param {QueryClient} queryClient - TanStack Query client
 */
export async function prefetchNotifications(queryClient) {
  await queryClient.prefetchQuery({
    queryKey: SETTINGS_QUERY_KEYS.notifications,
    queryFn: async () => {
      const response = await fetch('/api/user/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      return await response.json();
    },
    ...getSettingsQueryOptions(),
  });
}

/**
 * Invalidate settings cache
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type ('profile', 'privacy', 'notifications', or 'all')
 */
export function invalidateSettingsCache(queryClient, type = 'all') {
  const keysToInvalidate = type === 'all' 
    ? SETTINGS_QUERY_KEYS.all
    : [SETTINGS_QUERY_KEYS[type]].filter(Boolean);

  keysToInvalidate.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });

  console.log(`[settings cache] Invalidated ${type} settings cache`);
}

/**
 * Invalidate cache on explicit update
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type
 */
export function invalidateOnUpdate(queryClient, type) {
  invalidateSettingsCache(queryClient, type);
}

/**
 * Invalidate cache on realtime update
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type
 */
export function invalidateOnRealtimeUpdate(queryClient, type) {
  // Invalidate to trigger refetch
  invalidateSettingsCache(queryClient, type);
}

/**
 * Invalidate cache on user-triggered refresh
 * @param {QueryClient} queryClient - TanStack Query client
 */
export function invalidateOnRefresh(queryClient) {
  invalidateSettingsCache(queryClient, 'all');
  
  // Also refetch immediately
  refetchAllSettings(queryClient);
}

/**
 * Refetch all settings
 * @param {QueryClient} queryClient - TanStack Query client
 */
export async function refetchAllSettings(queryClient) {
  await Promise.allSettled([
    queryClient.refetchQueries({ queryKey: SETTINGS_QUERY_KEYS.profile }),
    queryClient.refetchQueries({ queryKey: SETTINGS_QUERY_KEYS.privacy }),
    queryClient.refetchQueries({ queryKey: SETTINGS_QUERY_KEYS.notifications }),
  ]);
}

/**
 * Get cached settings data
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type
 * @returns {Object|null} Cached data or null
 */
export function getCachedSettings(queryClient, type) {
  const key = SETTINGS_QUERY_KEYS[type];
  if (!key) return null;

  const queryData = queryClient.getQueryData(key);
  return queryData || null;
}

/**
 * Get cached settings with fallback
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type
 * @param {Object} fallback - Fallback data
 * @returns {Object} Cached data or fallback
 */
export function getCachedSettingsWithFallback(queryClient, type, fallback = {}) {
  const cached = getCachedSettings(queryClient, type);
  return cached || fallback;
}

/**
 * Set cached settings data
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type
 * @param {Object} data - Data to cache
 */
export function setCachedSettings(queryClient, type, data) {
  const key = SETTINGS_QUERY_KEYS[type];
  if (!key) return;

  queryClient.setQueryData(key, data);
}

/**
 * Check if settings are stale
 * @param {QueryClient} queryClient - TanStack Query client
 * @param {string} type - Settings type
 * @returns {boolean} True if stale
 */
export function isSettingsStale(queryClient, type) {
  const key = SETTINGS_QUERY_KEYS[type];
  if (!key) return true;

  const queryState = queryClient.getQueryState(key);
  if (!queryState || !queryState.dataUpdatedAt) return true;

  const staleTime = SETTINGS_CACHE_CONFIG.STALE_TIME;
  const timeSinceUpdate = Date.now() - queryState.dataUpdatedAt;
  
  return timeSinceUpdate > staleTime;
}

/**
 * Get settings cache statistics
 * @param {QueryClient} queryClient - TanStack Query client
 * @returns {Object} Cache statistics
 */
export function getCacheStats(queryClient) {
  const stats = {
    profile: {
      cached: !!getCachedSettings(queryClient, 'profile'),
      stale: isSettingsStale(queryClient, 'profile'),
    },
    privacy: {
      cached: !!getCachedSettings(queryClient, 'privacy'),
      stale: isSettingsStale(queryClient, 'privacy'),
    },
    notifications: {
      cached: !!getCachedSettings(queryClient, 'notifications'),
      stale: isSettingsStale(queryClient, 'notifications'),
    },
  };

  return stats;
}

/**
 * Clear all settings cache
 * @param {QueryClient} queryClient - TanStack Query client
 */
export function clearSettingsCache(queryClient) {
  SETTINGS_QUERY_KEYS.all.forEach((key) => {
    queryClient.removeQueries({ queryKey: key });
  });

  console.log('[settings cache] Cleared all settings cache');
}


