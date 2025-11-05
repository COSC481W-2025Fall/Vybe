/**
 * Privacy Enforcement Middleware
 * 
 * Utility functions to enforce privacy rules across the application.
 * These functions check privacy settings and determine what content
 * users can access based on their relationship and privacy preferences.
 * 
 * @module privacy/enforcer
 */

/**
 * Privacy level constants
 */
const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
};

/**
 * Friend request setting constants
 */
const FRIEND_REQUEST_SETTINGS = {
  EVERYONE: 'everyone',
  FRIENDS_OF_FRIENDS: 'friends_of_friends',
  NOBODY: 'nobody',
};

/**
 * In-memory cache for privacy settings
 * Key: user_id, Value: { settings, timestamp }
 */
const privacyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch privacy settings for a user (with caching)
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to fetch settings for
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object|null>} Privacy settings object or null if not found
 */
async function fetchPrivacySettings(supabase, userId, forceRefresh = false) {
  // Check cache first
  if (!forceRefresh) {
    const cached = privacyCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.settings;
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[privacy/enforcer] Error fetching privacy settings:', error);
      return null;
    }

    // Use defaults if no settings exist
    const settings = data || getDefaultPrivacySettings();

    // Cache the settings
    privacyCache.set(userId, {
      settings,
      timestamp: Date.now(),
    });

    return settings;
  } catch (error) {
    console.error('[privacy/enforcer] Unexpected error fetching privacy settings:', error);
    return null;
  }
}

/**
 * Get default privacy settings
 * 
 * @returns {Object} Default privacy settings
 */
function getDefaultPrivacySettings() {
  return {
    profile_visibility: PRIVACY_LEVELS.PUBLIC,
    playlist_visibility: PRIVACY_LEVELS.PUBLIC,
    listening_activity_visible: true,
    song_of_day_visibility: PRIVACY_LEVELS.PUBLIC,
    friend_request_setting: FRIEND_REQUEST_SETTINGS.EVERYONE,
    searchable: true,
    activity_feed_visible: true,
  };
}

/**
 * Check if two users are friends
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<boolean>} True if users are friends
 */
async function areFriends(supabase, userId1, userId2) {
  if (userId1 === userId2) {
    return true; // User is always "friends" with themselves
  }

  try {
    // Check if there's a friendship in either direction
    const { data, error } = await supabase
      .from('friends')
      .select('id')
      .or(`user_id.eq.${userId1},friend_id.eq.${userId1}`)
      .or(`user_id.eq.${userId2},friend_id.eq.${userId2}`)
      .limit(1);

    if (error) {
      console.error('[privacy/enforcer] Error checking friendship:', error);
      return false;
    }

    // Check if the friendship exists between these two users
    return data?.some(friendship => {
      const u1 = friendship.user_id === userId1 || friendship.friend_id === userId1;
      const u2 = friendship.user_id === userId2 || friendship.friend_id === userId2;
      return u1 && u2;
    }) || false;
  } catch (error) {
    console.error('[privacy/enforcer] Unexpected error checking friendship:', error);
    return false;
  }
}

/**
 * Check if a viewer can view a target user's profile
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @param {string} targetUserId - ID of the user whose profile is being viewed
 * @returns {Promise<boolean>} True if viewer can see the profile
 */
export async function canViewProfile(supabase, viewerId, targetUserId) {
  // User can always view their own profile
  if (viewerId === targetUserId) {
    return true;
  }

  // Fetch target user's privacy settings
  const privacySettings = await fetchPrivacySettings(supabase, targetUserId);
  if (!privacySettings) {
    // Default to public if no settings
    return true;
  }

  const visibility = privacySettings.profile_visibility;

  // Public profiles are visible to everyone
  if (visibility === PRIVACY_LEVELS.PUBLIC) {
    return true;
  }

  // Private profiles are only visible to the user
  if (visibility === PRIVACY_LEVELS.PRIVATE) {
    return false;
  }

  // Friends-only profiles require authentication and friendship
  if (visibility === PRIVACY_LEVELS.FRIENDS) {
    if (!viewerId) {
      return false; // Anonymous users can't see friends-only profiles
    }
    return await areFriends(supabase, viewerId, targetUserId);
  }

  // Default to false for unknown visibility levels
  return false;
}

/**
 * Check if a viewer can view a target user's playlists
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @param {string} targetUserId - ID of the user whose playlists are being viewed
 * @returns {Promise<boolean>} True if viewer can see the playlists
 */
export async function canViewPlaylists(supabase, viewerId, targetUserId) {
  // User can always view their own playlists
  if (viewerId === targetUserId) {
    return true;
  }

  // Fetch target user's privacy settings
  const privacySettings = await fetchPrivacySettings(supabase, targetUserId);
  if (!privacySettings) {
    // Default to public if no settings
    return true;
  }

  const visibility = privacySettings.playlist_visibility;

  // Public playlists are visible to everyone
  if (visibility === PRIVACY_LEVELS.PUBLIC) {
    return true;
  }

  // Private playlists are only visible to the user
  if (visibility === PRIVACY_LEVELS.PRIVATE) {
    return false;
  }

  // Friends-only playlists require authentication and friendship
  if (visibility === PRIVACY_LEVELS.FRIENDS) {
    if (!viewerId) {
      return false; // Anonymous users can't see friends-only playlists
    }
    return await areFriends(supabase, viewerId, targetUserId);
  }

  // Default to false for unknown visibility levels
  return false;
}

/**
 * Check if a viewer can see a target user's listening activity
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @param {string} targetUserId - ID of the user whose activity is being viewed
 * @returns {Promise<boolean>} True if viewer can see the listening activity
 */
export async function canViewListeningActivity(supabase, viewerId, targetUserId) {
  // User can always view their own listening activity
  if (viewerId === targetUserId) {
    return true;
  }

  // Fetch target user's privacy settings
  const privacySettings = await fetchPrivacySettings(supabase, targetUserId);
  if (!privacySettings) {
    // Default to visible if no settings
    return true;
  }

  // Check if listening activity is visible
  return privacySettings.listening_activity_visible === true;
}

/**
 * Check if a viewer can see a target user's Song of the Day
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @param {string} targetUserId - ID of the user whose Song of the Day is being viewed
 * @returns {Promise<boolean>} True if viewer can see the Song of the Day
 */
export async function canViewSongOfDay(supabase, viewerId, targetUserId) {
  // User can always view their own Song of the Day
  if (viewerId === targetUserId) {
    return true;
  }

  // Fetch target user's privacy settings
  const privacySettings = await fetchPrivacySettings(supabase, targetUserId);
  if (!privacySettings) {
    // Default to public if no settings
    return true;
  }

  const visibility = privacySettings.song_of_day_visibility;

  // Public Song of the Day is visible to everyone
  if (visibility === PRIVACY_LEVELS.PUBLIC) {
    return true;
  }

  // Private Song of the Day is only visible to the user
  if (visibility === PRIVACY_LEVELS.PRIVATE) {
    return false;
  }

  // Friends-only Song of the Day requires authentication and friendship
  if (visibility === PRIVACY_LEVELS.FRIENDS) {
    if (!viewerId) {
      return false; // Anonymous users can't see friends-only Song of the Day
    }
    return await areFriends(supabase, viewerId, targetUserId);
  }

  // Default to false for unknown visibility levels
  return false;
}

/**
 * Check if a user appears in search results
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user should appear in search
 */
export async function isSearchable(supabase, userId) {
  const privacySettings = await fetchPrivacySettings(supabase, userId);
  if (!privacySettings) {
    // Default to searchable if no settings
    return true;
  }

  return privacySettings.searchable === true;
}

/**
 * Check if a viewer can see a target user's activity feed
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @param {string} targetUserId - ID of the user whose activity feed is being viewed
 * @returns {Promise<boolean>} True if viewer can see the activity feed
 */
export async function canViewActivityFeed(supabase, viewerId, targetUserId) {
  // User can always view their own activity feed
  if (viewerId === targetUserId) {
    return true;
  }

  // Fetch target user's privacy settings
  const privacySettings = await fetchPrivacySettings(supabase, targetUserId);
  if (!privacySettings) {
    // Default to visible if no settings
    return true;
  }

  // Check if activity feed is visible
  return privacySettings.activity_feed_visible === true;
}

/**
 * Apply privacy filter to a users query
 * Filters out users that shouldn't appear based on privacy settings
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {Object} query - Supabase query builder (users table)
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @returns {Promise<Object>} Filtered query
 */
export async function applyUserPrivacyFilter(supabase, query, viewerId) {
  // For anonymous users, only show public and searchable users
  if (!viewerId) {
    // This requires a join with user_privacy_settings table
    // For now, we'll rely on RLS policies or implement this at the query level
    // TODO: Implement proper filtering with join
    return query;
  }

  // For authenticated users, apply more complex filtering
  // This would need to join with user_privacy_settings and friends tables
  // For now, we'll rely on RLS policies
  // TODO: Implement proper filtering with joins
  
  return query;
}

/**
 * Apply privacy filter to a playlists query
 * Filters out playlists from users that the viewer shouldn't see
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {Object} query - Supabase query builder (playlists table)
 * @param {string} viewerId - ID of the user viewing (null/undefined for anonymous)
 * @param {string} ownerId - ID of the playlist owner
 * @returns {Promise<Object>} Filtered query
 */
export async function applyPlaylistPrivacyFilter(supabase, query, viewerId, ownerId) {
  // User can always see their own playlists
  if (viewerId === ownerId) {
    return query;
  }

  // Check if viewer can see owner's playlists
  const canView = await canViewPlaylists(supabase, viewerId, ownerId);
  
  if (!canView) {
    // Filter out playlists from this user
    // This would typically be done by adding a condition to the query
    // For now, we'll rely on the calling code to handle this
    return query.eq('user_id', null); // Empty result
  }

  return query;
}

/**
 * Clear privacy settings cache for a specific user
 * 
 * @param {string} userId - User ID to clear cache for (optional, clears all if not provided)
 */
export function clearPrivacyCache(userId = null) {
  if (userId) {
    privacyCache.delete(userId);
  } else {
    privacyCache.clear();
  }
}

/**
 * Get cached privacy settings (for testing/debugging)
 * 
 * @param {string} userId - User ID
 * @returns {Object|null} Cached settings or null
 */
export function getCachedPrivacySettings(userId) {
  const cached = privacyCache.get(userId);
  return cached ? cached.settings : null;
}

/**
 * Check if user can send friend request to another user
 * Based on friend_request_setting privacy preference
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} requesterId - ID of the user sending the request
 * @param {string} targetUserId - ID of the user receiving the request
 * @returns {Promise<boolean>} True if requester can send friend request
 */
export async function canSendFriendRequest(supabase, requesterId, targetUserId) {
  // User can't send friend request to themselves
  if (requesterId === targetUserId) {
    return false;
  }

  // Fetch target user's privacy settings
  const privacySettings = await fetchPrivacySettings(supabase, targetUserId);
  if (!privacySettings) {
    // Default to allowing everyone if no settings
    return true;
  }

  const setting = privacySettings.friend_request_setting;

  // Everyone can send friend requests
  if (setting === FRIEND_REQUEST_SETTINGS.EVERYONE) {
    return true;
  }

  // Nobody can send friend requests
  if (setting === FRIEND_REQUEST_SETTINGS.NOBODY) {
    return false;
  }

  // Friends of friends can send requests
  if (setting === FRIEND_REQUEST_SETTINGS.FRIENDS_OF_FRIENDS) {
    // Check if requester is friends with any of target's friends
    // This is a simplified check - may need more complex logic
    // TODO: Implement friends-of-friends check
    const areFriendsAlready = await areFriends(supabase, requesterId, targetUserId);
    if (areFriendsAlready) {
      return false; // Already friends
    }
    // For now, return true (simplified implementation)
    // In a full implementation, we'd check if there's a mutual friend
    return true;
  }

  // Default to false for unknown settings
  return false;
}

