'use client';

/**
 * Prefetch Utilities
 * 
 * Preload commonly needed data in the background to improve perceived performance.
 * Uses requestIdleCallback to avoid blocking the main thread.
 */

import { 
  setCache, 
  getCache, 
  isCacheStale,
  CACHE_TTL, 
  CACHE_KEYS 
} from './clientCache';

/**
 * Schedule a task during browser idle time
 */
function scheduleIdleTask(task, timeout = 2000) {
  if (typeof window === 'undefined') return;
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(task, { timeout });
  } else {
    // Fallback for Safari
    setTimeout(task, 100);
  }
}

/**
 * Prefetch user's groups in the background
 * Note: Uses a simpler query to avoid Supabase join issues
 */
export async function prefetchUserGroups(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.USER_GROUPS)) {
    return getCache(CACHE_KEYS.USER_GROUPS);
  }
  
  try {
    // Get group IDs the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    if (memberError) throw memberError;
    
    if (!memberships || memberships.length === 0) {
      setCache(CACHE_KEYS.USER_GROUPS, [], CACHE_TTL.USER_GROUPS);
      return [];
    }
    
    // Get group details - only select columns that exist
    const groupIds = memberships.map(m => m.group_id);
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select('id, name, description, slug, created_at')
      .in('id', groupIds);
    
    if (groupError) throw groupError;
    
    setCache(CACHE_KEYS.USER_GROUPS, groups || [], CACHE_TTL.USER_GROUPS);
    console.log(`[prefetch] Cached ${groups?.length || 0} user groups`);
    return groups;
  } catch (error) {
    // Silent fail - prefetch is not critical
    console.warn('[prefetch] Could not prefetch groups:', error?.message || 'Unknown error');
    return null;
  }
}

/**
 * Prefetch user's friends in the background
 * Uses the API endpoint which handles the complex friend query
 */
export async function prefetchUserFriends(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.USER_FRIENDS)) {
    return getCache(CACHE_KEYS.USER_FRIENDS);
  }
  
  try {
    // Use the API endpoint which handles friends properly
    const response = await fetch('/api/friends');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success && data.friends) {
      setCache(CACHE_KEYS.USER_FRIENDS, data.friends, CACHE_TTL.USER_FRIENDS);
      console.log(`[prefetch] Cached ${data.friends.length} user friends`);
      return data.friends;
    }
    return null;
  } catch (error) {
    // Silent fail - prefetch is not critical
    console.warn('[prefetch] Could not prefetch friends:', error?.message || 'Unknown error');
    return null;
  }
}

/**
 * Prefetch connected accounts status
 * Uses auth identities which are always available
 */
export async function prefetchConnectedAccounts(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.CONNECTED_ACCOUNTS)) {
    return getCache(CACHE_KEYS.CONNECTED_ACCOUNTS);
  }
  
  try {
    // Get user's auth identities (more reliable than token tables)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    const accounts = {
      spotify: user.identities?.some(id => id.provider === 'spotify') || false,
      youtube: user.identities?.some(id => id.provider === 'google') || false,
    };
    
    setCache(CACHE_KEYS.CONNECTED_ACCOUNTS, accounts, CACHE_TTL.USER_PROFILE);
    console.log('[prefetch] Cached connected accounts status');
    return accounts;
  } catch (error) {
    // Silent fail - prefetch is not critical
    console.warn('[prefetch] Could not prefetch connected accounts:', error?.message || 'Unknown error');
    return null;
  }
}

/**
 * Prefetch user profile
 * Note: Profile table may not exist in all setups, skip silently
 */
export async function prefetchUserProfile(supabase, userId) {
  // Skip profile prefetch - table doesn't exist in current schema
  // This is a no-op for now, can be enabled when profiles table is added
  return null;
}

/**
 * Prefetch all commonly needed user data
 * Called once when user logs in or app loads with authenticated user
 */
export function prefetchAllUserData(supabase, userId) {
  if (!userId || typeof window === 'undefined') return;
  
  console.log('[prefetch] Starting background prefetch for user data...');
  
  // Use idle callback to avoid blocking UI
  scheduleIdleTask(() => {
    // Run prefetches in parallel (they don't depend on each other)
    Promise.allSettled([
      prefetchUserProfile(supabase, userId),
      prefetchUserGroups(supabase, userId),
      prefetchUserFriends(supabase, userId),
      prefetchConnectedAccounts(supabase, userId),
    ]).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`[prefetch] Background prefetch complete: ${successful}/${results.length} successful`);
    });
  });
}

/**
 * Prefetch group details (call when user hovers over or is likely to click a group)
 */
export async function prefetchGroupDetails(supabase, groupId) {
  if (!groupId) return;
  
  const cacheKey = `group_${groupId}`;
  
  // Skip if cache is fresh
  if (!isCacheStale(cacheKey)) {
    return getCache(cacheKey);
  }
  
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_playlists (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('id', groupId)
      .single();
    
    if (error) throw error;
    
    setCache(cacheKey, data, CACHE_TTL.GROUP_DETAILS);
    return data;
  } catch (error) {
    console.error('[prefetch] Error prefetching group:', error);
    return null;
  }
}

/**
 * Predictive prefetch - call on link hover to preload next page data
 */
export function prefetchOnHover(supabase, type, id) {
  if (!id || typeof window === 'undefined') return;
  
  // Use a small delay to avoid prefetching on accidental hovers
  const timeoutId = setTimeout(() => {
    scheduleIdleTask(() => {
      switch (type) {
        case 'group':
          prefetchGroupDetails(supabase, id);
          break;
        // Add more types as needed
        default:
          break;
      }
    }, 1000); // 1 second timeout for idle callback
  }, 150); // 150ms hover delay
  
  return () => clearTimeout(timeoutId);
}

/**
 * Route-based prefetch - preload data for likely next routes
 */
export function prefetchForRoute(supabase, userId, currentRoute) {
  if (!userId || typeof window === 'undefined') return;
  
  scheduleIdleTask(() => {
    switch (currentRoute) {
      case '/':
      case '/home':
        // On home, user likely to visit groups or friends
        prefetchUserGroups(supabase, userId);
        prefetchUserFriends(supabase, userId);
        break;
      
      case '/settings':
        // On settings, prefetch connected accounts
        prefetchConnectedAccounts(supabase, userId);
        break;
      
      default:
        // For unknown routes, just ensure basic data is cached
        if (isCacheStale(CACHE_KEYS.USER_PROFILE)) {
          prefetchUserProfile(supabase, userId);
        }
    }
  }, 3000); // 3 second timeout - not critical
}
