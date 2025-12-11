/**
 * Client-Side Persistent Cache
 * 
 * A unified caching layer that persists data to localStorage with:
 * - Automatic TTL (time-to-live) expiration
 * - Version control for cache invalidation on app updates
 * - Size limits to prevent localStorage overflow
 * - Compression for large data
 * - Stale-while-revalidate pattern support
 * 
 * Use this for data that:
 * - Changes infrequently (groups, playlists, friends)
 * - Is expensive to fetch
 * - Should persist across page refreshes
 */

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'vybe_cache_';
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB max total cache
const MAX_ITEM_SIZE = 8 * 1024 * 1024; // 8MB max per item (friends list can be large)

// Default TTLs for different data types
export const CACHE_TTL = {
  // User data (rarely changes)
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  USER_GROUPS: 5 * 60 * 1000, // 5 minutes
  USER_FRIENDS: 5 * 60 * 1000, // 5 minutes
  
  // Group/Playlist data (changes more often)
  GROUP_DETAILS: 3 * 60 * 1000, // 3 minutes
  PLAYLIST_SONGS: 2 * 60 * 1000, // 2 minutes
  
  // Metadata (changes infrequently)
  SONG_METADATA: 30 * 60 * 1000, // 30 minutes
  COMMUNITY_LIST: 5 * 60 * 1000, // 5 minutes
  
  // Temporary data
  SEARCH_RESULTS: 60 * 1000, // 1 minute
  
  // Long-term cache
  SPOTIFY_TOKEN_EXPIRY: 55 * 60 * 1000, // 55 minutes (tokens last 60)
};

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  USER_GROUPS: 'user_groups',
  USER_FRIENDS: 'user_friends',
  CONNECTED_ACCOUNTS: 'connected_accounts',
  GROUP_PREFIX: 'group_',
  PLAYLIST_PREFIX: 'playlist_',
  SONG_PREFIX: 'song_',
  SEARCH_PREFIX: 'search_',
};

/**
 * Check if localStorage is available
 */
function isStorageAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the full cache key with prefix and version
 */
function getCacheKey(key) {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
}

/**
 * Estimate the size of a value in bytes
 */
function estimateSize(value) {
  return new Blob([JSON.stringify(value)]).size;
}

/**
 * Get total cache size
 */
function getTotalCacheSize() {
  if (!isStorageAvailable()) return 0;
  
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  return total * 2; // UTF-16 characters = 2 bytes each
}

/**
 * Evict oldest cache entries until under size limit
 */
function evictOldest(neededSpace = 0) {
  if (!isStorageAvailable()) return;
  
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        entries.push({ key, timestamp: item.timestamp || 0 });
      } catch {
        // Invalid entry, remove it
        localStorage.removeItem(key);
      }
    }
  }
  
  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  // Remove entries until we have enough space
  let freed = 0;
  for (const entry of entries) {
    if (getTotalCacheSize() + neededSpace <= MAX_CACHE_SIZE && freed > neededSpace) {
      break;
    }
    const itemSize = localStorage.getItem(entry.key)?.length || 0;
    localStorage.removeItem(entry.key);
    freed += itemSize * 2;
  }
}

/**
 * Set a value in the cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time-to-live in milliseconds
 * @returns {boolean} Success
 */
export function setCache(key, value, ttl = CACHE_TTL.USER_PROFILE) {
  if (!isStorageAvailable()) return false;
  
  try {
    const cacheKey = getCacheKey(key);
    const item = {
      value,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
      version: CACHE_VERSION,
    };
    
    const serialized = JSON.stringify(item);
    const size = serialized.length * 2;
    
    // Check item size
    if (size > MAX_ITEM_SIZE) {
      console.warn(`[clientCache] Item too large: ${key} (${(size / 1024).toFixed(1)}KB)`);
      return false;
    }
    
    // Check total size and evict if needed
    if (getTotalCacheSize() + size > MAX_CACHE_SIZE) {
      evictOldest(size);
    }
    
    localStorage.setItem(cacheKey, serialized);
    return true;
  } catch (error) {
    console.error('[clientCache] Error setting cache:', error);
    // Try to free space and retry once
    evictOldest(MAX_ITEM_SIZE);
    try {
      localStorage.setItem(getCacheKey(key), JSON.stringify({
        value,
        timestamp: Date.now(),
        expiry: Date.now() + ttl,
        version: CACHE_VERSION,
      }));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get a value from the cache
 * @param {string} key - Cache key
 * @param {Object} options - Options
 * @param {boolean} options.allowStale - Return stale data if not expired (default: false)
 * @returns {*} Cached value or null
 */
export function getCache(key, options = {}) {
  if (!isStorageAvailable()) return null;
  
  try {
    const cacheKey = getCacheKey(key);
    const stored = localStorage.getItem(cacheKey);
    if (!stored) return null;
    
    const item = JSON.parse(stored);
    
    // Version check
    if (item.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    const now = Date.now();
    const isExpired = now > item.expiry;
    
    if (isExpired && !options.allowStale) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return item.value;
  } catch (error) {
    console.error('[clientCache] Error getting cache:', error);
    return null;
  }
}

/**
 * Check if a cache entry exists and is valid
 * @param {string} key - Cache key
 * @returns {boolean}
 */
export function hasCache(key) {
  return getCache(key) !== null;
}

/**
 * Check if a cache entry is stale (expired)
 * @param {string} key - Cache key
 * @returns {boolean}
 */
export function isCacheStale(key) {
  if (!isStorageAvailable()) return true;
  
  try {
    const cacheKey = getCacheKey(key);
    const stored = localStorage.getItem(cacheKey);
    if (!stored) return true;
    
    const item = JSON.parse(stored);
    return Date.now() > item.expiry;
  } catch {
    return true;
  }
}

/**
 * Remove a value from the cache
 * @param {string} key - Cache key
 */
export function removeCache(key) {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(getCacheKey(key));
}

/**
 * Clear all cache entries
 */
export function clearAllCache() {
  if (!isStorageAvailable()) return;
  
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`[clientCache] Cleared ${keysToRemove.length} cache entries`);
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache() {
  if (!isStorageAvailable()) return;
  
  let removed = 0;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (Date.now() > item.expiry) {
          localStorage.removeItem(key);
          removed++;
        }
      } catch {
        localStorage.removeItem(key);
        removed++;
      }
    }
  }
  
  if (removed > 0) {
    console.log(`[clientCache] Cleaned up ${removed} expired entries`);
  }
}

/**
 * Get cache statistics
 * @returns {Object}
 */
export function getCacheStats() {
  if (!isStorageAvailable()) return { entries: 0, size: 0, maxSize: MAX_CACHE_SIZE };
  
  let entries = 0;
  let size = 0;
  let stale = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      entries++;
      size += (localStorage.getItem(key)?.length || 0) * 2;
      
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (Date.now() > item.expiry) stale++;
      } catch {}
    }
  }
  
  return {
    entries,
    size,
    sizeKB: (size / 1024).toFixed(1),
    maxSize: MAX_CACHE_SIZE,
    maxSizeKB: (MAX_CACHE_SIZE / 1024).toFixed(1),
    usagePercent: ((size / MAX_CACHE_SIZE) * 100).toFixed(1),
    stale,
  };
}

// ============================================
// High-Level Cache Functions for Common Data
// ============================================

/**
 * Cache user's groups list
 */
export function cacheUserGroups(groups) {
  return setCache(CACHE_KEYS.USER_GROUPS, groups, CACHE_TTL.USER_GROUPS);
}

export function getCachedUserGroups() {
  return getCache(CACHE_KEYS.USER_GROUPS);
}

/**
 * Cache user's friends list
 */
export function cacheUserFriends(friends) {
  return setCache(CACHE_KEYS.USER_FRIENDS, friends, CACHE_TTL.USER_FRIENDS);
}

export function getCachedUserFriends() {
  return getCache(CACHE_KEYS.USER_FRIENDS);
}

/**
 * Cache user profile
 */
export function cacheUserProfile(profile) {
  return setCache(CACHE_KEYS.USER_PROFILE, profile, CACHE_TTL.USER_PROFILE);
}

export function getCachedUserProfile() {
  return getCache(CACHE_KEYS.USER_PROFILE);
}

/**
 * Cache connected accounts status
 */
export function cacheConnectedAccounts(accounts) {
  return setCache(CACHE_KEYS.CONNECTED_ACCOUNTS, accounts, CACHE_TTL.USER_PROFILE);
}

export function getCachedConnectedAccounts() {
  return getCache(CACHE_KEYS.CONNECTED_ACCOUNTS);
}

/**
 * Cache group details
 */
export function cacheGroupDetails(groupId, details) {
  return setCache(`${CACHE_KEYS.GROUP_PREFIX}${groupId}`, details, CACHE_TTL.GROUP_DETAILS);
}

export function getCachedGroupDetails(groupId) {
  return getCache(`${CACHE_KEYS.GROUP_PREFIX}${groupId}`);
}

/**
 * Cache playlist songs
 */
export function cachePlaylistSongs(playlistId, songs) {
  return setCache(`${CACHE_KEYS.PLAYLIST_PREFIX}${playlistId}`, songs, CACHE_TTL.PLAYLIST_SONGS);
}

export function getCachedPlaylistSongs(playlistId) {
  return getCache(`${CACHE_KEYS.PLAYLIST_PREFIX}${playlistId}`);
}

/**
 * Cache search results
 */
export function cacheSearchResults(query, platform, results) {
  const key = `${CACHE_KEYS.SEARCH_PREFIX}${platform}_${query.toLowerCase().trim()}`;
  return setCache(key, results, CACHE_TTL.SEARCH_RESULTS);
}

export function getCachedSearchResults(query, platform) {
  const key = `${CACHE_KEYS.SEARCH_PREFIX}${platform}_${query.toLowerCase().trim()}`;
  return getCache(key);
}

/**
 * Invalidate all user-related caches (call on logout or user change)
 */
export function invalidateUserCache() {
  removeCache(CACHE_KEYS.USER_PROFILE);
  removeCache(CACHE_KEYS.USER_GROUPS);
  removeCache(CACHE_KEYS.USER_FRIENDS);
  removeCache(CACHE_KEYS.CONNECTED_ACCOUNTS);
  console.log('[clientCache] Invalidated user cache');
}

// ============================================
// Stale-While-Revalidate Pattern
// ============================================

/**
 * Get data with stale-while-revalidate pattern
 * Returns cached data immediately (even if stale), then revalidates in background
 * 
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function to fetch fresh data
 * @param {number} ttl - TTL for new data
 * @param {Function} onRevalidate - Called when fresh data is fetched (optional)
 * @returns {Promise<{data: *, fromCache: boolean, stale: boolean}>}
 */
export async function getWithSWR(key, fetcher, ttl, onRevalidate) {
  const cached = getCache(key, { allowStale: true });
  const isStale = isCacheStale(key);
  
  // If we have cached data, return it immediately
  if (cached !== null) {
    // Revalidate in background if stale
    if (isStale) {
      fetcher().then(freshData => {
        setCache(key, freshData, ttl);
        if (onRevalidate) onRevalidate(freshData);
      }).catch(err => {
        console.error('[clientCache] SWR revalidation failed:', err);
      });
    }
    
    return { data: cached, fromCache: true, stale: isStale };
  }
  
  // No cached data, fetch fresh
  try {
    const freshData = await fetcher();
    setCache(key, freshData, ttl);
    return { data: freshData, fromCache: false, stale: false };
  } catch (error) {
    throw error;
  }
}

// Initialize cleanup on load (browser only)
if (typeof window !== 'undefined') {
  // Clean up expired entries on page load
  setTimeout(cleanupExpiredCache, 1000);
  
  // Clean up periodically (every 10 minutes)
  setInterval(cleanupExpiredCache, 10 * 60 * 1000);
}
