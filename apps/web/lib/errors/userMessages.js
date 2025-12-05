/**
 * Consumer-Friendly Error Messages
 * 
 * All error messages shown to users should come from here.
 * Keep language simple, friendly, and actionable.
 * NO technical jargon, NO JSON, NO error codes visible to users.
 */

export const UserMessages = {
  // ═══════════════════════════════════════════════════════════
  // GENERAL ERRORS
  // ═══════════════════════════════════════════════════════════
  GENERIC_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR: "Couldn't connect to the server. Please check your internet connection.",
  SERVER_ERROR: "We're having some technical difficulties. Please try again in a moment.",
  TIMEOUT_ERROR: "This is taking longer than expected. Please try again.",
  NOT_FOUND: "We couldn't find what you're looking for.",
  
  // ═══════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════
  AUTH_REQUIRED: "Please sign in to continue.",
  AUTH_EXPIRED: "Your session has expired. Please sign in again.",
  AUTH_FAILED: "Sign in failed. Please try again.",
  SIGN_OUT_ERROR: "Couldn't sign out. Please try again.",
  
  // ═══════════════════════════════════════════════════════════
  // SMART SORT
  // ═══════════════════════════════════════════════════════════
  SORT_SUCCESS: "Your playlist has been sorted! 🎵",
  SORT_BUSY: "We're a bit busy right now. Your playlist was sorted using our quick algorithm instead.",
  SORT_QUEUE_FULL: "Lots of people are sorting right now! Your playlist was sorted using our quick algorithm.",
  SORT_FAILED: "Couldn't sort your playlist. Please try again.",
  SORT_RATE_LIMITED: "You've sorted a few times recently. Please wait a moment before trying again.",
  SORT_NO_SONGS: "Add some songs first, then you can sort them!",
  SORT_RESET_SUCCESS: "Sort order has been reset.",
  SORT_RESET_FAILED: "Couldn't reset the sort order. Please try again.",
  
  // ═══════════════════════════════════════════════════════════
  // GROUPS
  // ═══════════════════════════════════════════════════════════
  GROUP_NOT_FOUND: "This group doesn't exist or has been deleted.",
  GROUP_ACCESS_DENIED: "You don't have access to this group.",
  GROUP_CREATE_SUCCESS: "Group created! Share the join code with your friends.",
  GROUP_CREATE_FAILED: "Couldn't create the group. Please try again.",
  GROUP_JOIN_SUCCESS: "You've joined the group! 🎉",
  GROUP_JOIN_FAILED: "Couldn't join the group. Please check the join code and try again.",
  GROUP_INVALID_CODE: "That join code doesn't look right. Please double-check it.",
  GROUP_LEAVE_SUCCESS: "You've left the group.",
  GROUP_LEAVE_FAILED: "Couldn't leave the group. Please try again.",
  GROUP_DELETE_SUCCESS: "Group has been deleted.",
  GROUP_DELETE_FAILED: "Couldn't delete the group. Please try again.",
  MEMBER_REMOVED: "Member has been removed from the group.",
  MEMBER_REMOVE_FAILED: "Couldn't remove this member. Please try again.",
  
  // ═══════════════════════════════════════════════════════════
  // PLAYLISTS
  // ═══════════════════════════════════════════════════════════
  PLAYLIST_ADD_SUCCESS: "Playlist added! 🎶",
  PLAYLIST_ADD_FAILED: "Couldn't add this playlist. Please check the link and try again.",
  PLAYLIST_INVALID_URL: "That doesn't look like a valid playlist link. Try copying it again from Spotify or YouTube.",
  PLAYLIST_REMOVE_SUCCESS: "Playlist removed.",
  PLAYLIST_REMOVE_FAILED: "Couldn't remove the playlist. Please try again.",
  PLAYLIST_NOT_FOUND: "We couldn't find this playlist. It may have been deleted or made private.",
  PLAYLIST_EMPTY: "This playlist doesn't have any songs.",
  
  // ═══════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════
  EXPORT_SUCCESS: "Playlist exported successfully! Check your Spotify/YouTube.",
  EXPORT_FAILED: "Couldn't export the playlist. Please try again.",
  EXPORT_SPOTIFY_NOT_CONNECTED: "Connect your Spotify account first in Settings to export playlists.",
  EXPORT_YOUTUBE_NOT_CONNECTED: "Connect your YouTube account first in Settings to export playlists.",
  EXPORT_SPOTIFY_ERROR: "Couldn't create the Spotify playlist. Please try reconnecting your account in Settings.",
  EXPORT_YOUTUBE_ERROR: "Couldn't create the YouTube playlist. Please try reconnecting your account in Settings.",
  EXPORT_PARTIAL: "Playlist exported, but some songs couldn't be found.",
  
  // ═══════════════════════════════════════════════════════════
  // FRIENDS
  // ═══════════════════════════════════════════════════════════
  FRIEND_REQUEST_SENT: "Friend request sent! 💌",
  FRIEND_REQUEST_FAILED: "Couldn't send the friend request. Please try again.",
  FRIEND_REQUEST_ACCEPTED: "You're now friends! 🎉",
  FRIEND_REQUEST_DECLINED: "Friend request declined.",
  FRIEND_REMOVED: "Friend removed.",
  FRIEND_REMOVE_FAILED: "Couldn't remove this friend. Please try again.",
  FRIEND_NOT_FOUND: "Couldn't find this user.",
  FRIEND_ALREADY_SENT: "You've already sent a friend request to this person.",
  FRIEND_ALREADY_FRIENDS: "You're already friends!",
  
  // ═══════════════════════════════════════════════════════════
  // SONG OF THE DAY
  // ═══════════════════════════════════════════════════════════
  SOTD_SUCCESS: "Song of the day shared! 🎵",
  SOTD_FAILED: "Couldn't share your song. Please try again.",
  SOTD_ALREADY_SHARED: "You've already shared a song today. Come back tomorrow!",
  
  // ═══════════════════════════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════════════════════════
  PROFILE_UPDATE_SUCCESS: "Profile updated! ✨",
  PROFILE_UPDATE_FAILED: "Couldn't update your profile. Please try again.",
  PROFILE_PICTURE_SUCCESS: "Profile picture updated!",
  PROFILE_PICTURE_FAILED: "Couldn't update your profile picture. Please try a different image.",
  PROFILE_PICTURE_TOO_LARGE: "This image is too large. Please choose a smaller one (under 5MB).",
  USERNAME_TAKEN: "This username is already taken. Please try another one.",
  USERNAME_INVALID: "Username can only contain letters, numbers, and underscores.",
  
  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════
  SETTINGS_SAVED: "Settings saved!",
  SETTINGS_SAVE_FAILED: "Couldn't save your settings. Please try again.",
  THEME_APPLIED: "Theme applied! 🎨",
  THEME_RESET: "Theme reset to default.",
  ACCOUNT_DELETE_SUCCESS: "Your account has been deleted. We're sorry to see you go.",
  ACCOUNT_DELETE_FAILED: "Couldn't delete your account. Please contact support.",
  
  // ═══════════════════════════════════════════════════════════
  // COMMUNITIES
  // ═══════════════════════════════════════════════════════════
  COMMUNITY_JOIN_SUCCESS: "Welcome to the community! 🎉",
  COMMUNITY_JOIN_FAILED: "Couldn't join this community. Please try again.",
  COMMUNITY_LEAVE_SUCCESS: "You've left the community.",
  COMMUNITY_LEAVE_FAILED: "Couldn't leave the community. Please try again.",
  COMMUNITY_NOT_FOUND: "This community doesn't exist.",
  SONG_CURATED: "Song added to the community playlist!",
  SONG_CURATE_FAILED: "Couldn't add this song. Please try again.",
  
  // ═══════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════
  SEARCH_NO_RESULTS: "No results found. Try a different search term.",
  SEARCH_FAILED: "Search isn't working right now. Please try again.",
  
  // ═══════════════════════════════════════════════════════════
  // CLIPBOARD
  // ═══════════════════════════════════════════════════════════
  COPY_SUCCESS: "Copied to clipboard!",
  COPY_FAILED: "Couldn't copy. Please try selecting and copying manually.",
  
  // ═══════════════════════════════════════════════════════════
  // CONTACT
  // ═══════════════════════════════════════════════════════════
  CONTACT_SUCCESS: "Message sent! We'll get back to you soon.",
  CONTACT_FAILED: "Couldn't send your message. Please try again later.",
  
  // ═══════════════════════════════════════════════════════════
  // REALTIME
  // ═══════════════════════════════════════════════════════════
  REALTIME_CONNECTED: "You're connected!",
  REALTIME_RECONNECTING: "Reconnecting...",
  REALTIME_DISCONNECTED: "Connection lost. Some updates may be delayed.",
};

/**
 * Convert technical error to user-friendly message
 */
export function getUserFriendlyError(error, fallback = UserMessages.GENERIC_ERROR) {
  if (!error) return fallback;
  
  const message = error.message || error.toString() || '';
  const lowerMessage = message.toLowerCase();
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return UserMessages.NETWORK_ERROR;
  }
  
  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return UserMessages.TIMEOUT_ERROR;
  }
  
  // Auth errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return UserMessages.AUTH_REQUIRED;
  }
  if (lowerMessage.includes('session') || lowerMessage.includes('expired')) {
    return UserMessages.AUTH_EXPIRED;
  }
  
  // Not found
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return UserMessages.NOT_FOUND;
  }
  
  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return UserMessages.SORT_RATE_LIMITED;
  }
  
  // Queue/busy
  if (lowerMessage.includes('queue') || lowerMessage.includes('busy') || lowerMessage.includes('stress')) {
    return UserMessages.SORT_BUSY;
  }
  
  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('server') || lowerMessage.includes('internal')) {
    return UserMessages.SERVER_ERROR;
  }
  
  // Return fallback for anything else
  return fallback;
}

/**
 * Format error for toast notification
 * Always returns a user-friendly string
 */
export function formatErrorForToast(error, context = 'action') {
  // If it's already a user-friendly message from UserMessages, return it
  if (typeof error === 'string' && Object.values(UserMessages).includes(error)) {
    return error;
  }
  
  // Context-specific fallbacks
  const contextFallbacks = {
    sort: UserMessages.SORT_FAILED,
    export: UserMessages.EXPORT_FAILED,
    group: UserMessages.GROUP_CREATE_FAILED,
    playlist: UserMessages.PLAYLIST_ADD_FAILED,
    friend: UserMessages.FRIEND_REQUEST_FAILED,
    profile: UserMessages.PROFILE_UPDATE_FAILED,
    settings: UserMessages.SETTINGS_SAVE_FAILED,
    search: UserMessages.SEARCH_FAILED,
    contact: UserMessages.CONTACT_FAILED,
  };
  
  const fallback = contextFallbacks[context] || UserMessages.GENERIC_ERROR;
  return getUserFriendlyError(error, fallback);
}

export default UserMessages;

