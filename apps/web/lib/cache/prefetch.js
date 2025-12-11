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
 */
export async function prefetchUserGroups(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.USER_GROUPS)) {
    console.log('[prefetch] User groups cache is fresh, skipping');
    return getCache(CACHE_KEYS.USER_GROUPS);
  }
  
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group:groups (
          id,
          name,
          description,
          image_url,
          slug,
          created_at
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const groups = data?.map(m => m.group).filter(Boolean) || [];
    setCache(CACHE_KEYS.USER_GROUPS, groups, CACHE_TTL.USER_GROUPS);
    console.log(`[prefetch] Cached ${groups.length} user groups`);
    return groups;
  } catch (error) {
    console.error('[prefetch] Error prefetching groups:', error);
    return null;
  }
}

/**
 * Prefetch user's friends in the background
 */
export async function prefetchUserFriends(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.USER_FRIENDS)) {
    console.log('[prefetch] User friends cache is fresh, skipping');
    return getCache(CACHE_KEYS.USER_FRIENDS);
  }
  
  try {
    const { data, error } = await supabase.rpc('get_accepted_friends', {
      p_user_id: userId
    });
    
    if (error) throw error;
    
    setCache(CACHE_KEYS.USER_FRIENDS, data || [], CACHE_TTL.USER_FRIENDS);
    console.log(`[prefetch] Cached ${data?.length || 0} user friends`);
    return data;
  } catch (error) {
    console.error('[prefetch] Error prefetching friends:', error);
    return null;
  }
}

/**
 * Prefetch connected accounts status
 */
export async function prefetchConnectedAccounts(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.CONNECTED_ACCOUNTS)) {
    return getCache(CACHE_KEYS.CONNECTED_ACCOUNTS);
  }
  
  try {
    const [spotifyResult, youtubeResult] = await Promise.all([
      supabase
        .from('spotify_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('youtube_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);
    
    const accounts = {
      spotify: !!spotifyResult.data,
      youtube: !!youtubeResult.data,
    };
    
    setCache(CACHE_KEYS.CONNECTED_ACCOUNTS, accounts, CACHE_TTL.USER_PROFILE);
    console.log('[prefetch] Cached connected accounts status');
    return accounts;
  } catch (error) {
    console.error('[prefetch] Error prefetching connected accounts:', error);
    return null;
  }
}

/**
 * Prefetch user profile
 */
export async function prefetchUserProfile(supabase, userId) {
  if (!userId) return;
  
  // Skip if cache is fresh
  if (!isCacheStale(CACHE_KEYS.USER_PROFILE)) {
    return getCache(CACHE_KEYS.USER_PROFILE);
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    setCache(CACHE_KEYS.USER_PROFILE, data, CACHE_TTL.USER_PROFILE);
    console.log('[prefetch] Cached user profile');
    return data;
  } catch (error) {
    console.error('[prefetch] Error prefetching profile:', error);
    return null;
  }
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
