/**
 * Optimistic Updates Utility
 * 
 * Provides instant UI updates before server confirmation
 * with automatic rollback on failure
 */

/**
 * Create an optimistic update handler
 * 
 * @param {Object} options
 * @param {Function} options.setState - State setter function
 * @param {Function} options.apiCall - Async function that makes the API call
 * @param {Function} options.optimisticUpdate - Function that returns optimistic state
 * @param {Function} options.onSuccess - Called on success
 * @param {Function} options.onError - Called on error
 */
export async function withOptimisticUpdate({
  setState,
  getCurrentState,
  apiCall,
  optimisticUpdate,
  onSuccess,
  onError,
}) {
  // Store original state for rollback
  const originalState = getCurrentState();
  
  try {
    // Apply optimistic update immediately
    const optimisticState = optimisticUpdate(originalState);
    setState(optimisticState);
    
    // Make the actual API call
    const result = await apiCall();
    
    // On success, optionally update with server response
    if (onSuccess) {
      const finalState = onSuccess(optimisticState, result);
      if (finalState !== undefined) {
        setState(finalState);
      }
    }
    
    return { success: true, data: result };
  } catch (error) {
    // Rollback on failure
    setState(originalState);
    
    if (onError) {
      onError(error);
    }
    
    return { success: false, error };
  }
}

/**
 * Debounce function for reducing API calls
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Batch updates to reduce re-renders
 */
export class UpdateBatcher {
  constructor(flushInterval = 100) {
    this.updates = [];
    this.flushInterval = flushInterval;
    this.flushTimeout = null;
  }

  add(update) {
    this.updates.push(update);
    
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  flush() {
    if (this.updates.length === 0) return;
    
    const updates = [...this.updates];
    this.updates = [];
    this.flushTimeout = null;
    
    // Process all updates in a single batch
    return updates;
  }

  clear() {
    this.updates = [];
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}

/**
 * Simple in-memory cache with TTL
 */
export class SimpleCache {
  constructor(defaultTTL = 60000) { // 1 minute default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const globalCache = new SimpleCache();

// Cleanup expired cache entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => globalCache.cleanup(), 5 * 60 * 1000);
}

