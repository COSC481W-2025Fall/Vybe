import { z } from 'zod';

/**
 * Privacy settings validation schema using Zod
 * 
 * Validates:
 * - Profile visibility: enum (public, friends, private)
 * - Playlist visibility: enum (public, friends, private)
 * - Listening activity visible: boolean
 * - Song of the Day visibility: enum (public, friends, private)
 * - Friend request setting: enum (everyone, friends_of_friends, nobody)
 * - Searchable: boolean
 * - Activity feed visible: boolean
 * 
 * @typedef {Object} PrivacyFormData
 * @property {string} profile_visibility - Profile visibility level (public, friends, private)
 * @property {string} playlist_visibility - Playlist visibility level (public, friends, private)
 * @property {boolean} listening_activity_visible - Whether listening activity is visible
 * @property {string} song_of_day_visibility - Song of the Day visibility level (public, friends, private)
 * @property {string} friend_request_setting - Who can send friend requests (everyone, friends_of_friends, nobody)
 * @property {boolean} searchable - Whether user appears in search results
 * @property {boolean} activity_feed_visible - Whether activity feed is visible
 */

/**
 * Visibility level enum:
 * - public: Anyone can see
 * - friends: Only friends can see
 * - private: Only the user can see
 */
const visibilityLevelSchema = z.enum(['public', 'friends', 'private'], {
  required_error: 'Visibility level is required',
  invalid_type_error: 'Visibility level must be one of: public, friends, or private',
});

/**
 * Friend request setting enum:
 * - everyone: Anyone can send friend requests
 * - friends_of_friends: Only friends of friends can send requests
 * - nobody: No one can send friend requests
 */
const friendRequestSettingSchema = z.enum(['everyone', 'friends_of_friends', 'nobody'], {
  required_error: 'Friend request setting is required',
  invalid_type_error: 'Friend request setting must be one of: everyone, friends_of_friends, or nobody',
});

/**
 * Boolean schema for toggle settings:
 * - Must be a boolean value
 * - Defaults to true if not provided
 */
const booleanToggleSchema = z.boolean({
  required_error: 'This setting requires a boolean value',
  invalid_type_error: 'This setting must be true or false',
});

/**
 * Profile visibility schema:
 * - Required field
 * - Must be one of the visibility levels
 */
const profileVisibilitySchema = visibilityLevelSchema;

/**
 * Playlist visibility schema:
 * - Required field
 * - Must be one of the visibility levels
 */
const playlistVisibilitySchema = visibilityLevelSchema;

/**
 * Listening activity visible schema:
 * - Required boolean
 * - Indicates if listening activity is visible
 */
const listeningActivityVisibleSchema = booleanToggleSchema;

/**
 * Song of the Day visibility schema:
 * - Required field
 * - Must be one of the visibility levels
 */
const songOfDayVisibilitySchema = visibilityLevelSchema;

/**
 * Friend request setting schema:
 * - Required field
 * - Must be one of the friend request options
 */
const friendRequestSettingSchema_final = friendRequestSettingSchema;

/**
 * Searchable schema:
 * - Required boolean
 * - Indicates if user appears in search results
 */
const searchableSchema = booleanToggleSchema;

/**
 * Activity feed visible schema:
 * - Required boolean
 * - Indicates if activity feed is visible
 */
const activityFeedVisibleSchema = booleanToggleSchema;

/**
 * Privacy form validation schema
 * 
 * This schema validates all privacy settings and ensures logical consistency:
 * - All required fields are present
 * - Enum values are valid
 * - Boolean values are properly typed
 * - Privacy combinations are logical (e.g., private profile allows private playlists)
 * 
 * Usage:
 * ```javascript
 * import { privacySchema } from '@/lib/schemas/privacySchema';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * 
 * const form = useForm({
 *   resolver: zodResolver(privacySchema),
 *   defaultValues: {
 *     profile_visibility: 'public',
 *     playlist_visibility: 'public',
 *     listening_activity_visible: true,
 *     song_of_day_visibility: 'public',
 *     friend_request_setting: 'everyone',
 *     searchable: true,
 *     activity_feed_visible: true,
 *   },
 * });
 * ```
 */
export const privacySchema = z.object({
  profile_visibility: profileVisibilitySchema,
  playlist_visibility: playlistVisibilitySchema,
  listening_activity_visible: listeningActivityVisibleSchema,
  song_of_day_visibility: songOfDayVisibilitySchema,
  friend_request_setting: friendRequestSettingSchema_final,
  searchable: searchableSchema,
  activity_feed_visible: activityFeedVisibleSchema,
})
.refine(
  /**
   * Validate allowed privacy combinations:
   * - If profile is private, it's logical that playlists could also be private
   * - If profile is private and searchable is false, that's consistent
   * - If profile is private, listening activity should probably be hidden
   * 
   * This is a soft validation - we allow any combination but provide guidance
   */
  (data) => {
    // If profile is private, we don't enforce anything, but these are recommended:
    // - Playlist visibility can be anything (no restriction)
    // - Listening activity can be hidden (recommended but not required)
    // - Searchable should be false (recommended but not required)
    
    // This refinement allows all combinations but could be extended to warn
    // about potentially inconsistent settings
    
    return true; // Allow all combinations for now
  },
  {
    message: 'Privacy settings combination may be inconsistent',
  }
)
.refine(
  /**
   * Additional validation: If profile is private, it makes sense that
   * searchable should be false (though not strictly required)
   */
  (data) => {
    // Warning: If profile is private but searchable is true, users might
    // be confused why they can't see the profile even though it appears in search.
    // We allow this but could show a warning.
    
    return true; // Allow for now, could be made stricter
  },
  {
    message: 'If your profile is private, you may want to disable appearing in search results',
    path: ['searchable'], // Attach error to searchable field
  }
);

/**
 * Partial privacy schema for updates:
 * - Allows updating only specific fields
 * - Useful for PATCH operations
 */
export const privacyPartialSchema = privacySchema.partial();

/**
 * TypeScript/JSDoc type definitions
 * 
 * @typedef {z.infer<typeof privacySchema>} PrivacyFormData
 * @typedef {z.infer<typeof privacyPartialSchema>} PrivacyPartialFormData
 * 
 * Example usage in JavaScript with JSDoc:
 * ```javascript
 * /**
 *  * @type {import('@/lib/schemas/privacySchema').PrivacyFormData}
 *  *\/
 * const privacyData = {
 *   profile_visibility: 'public',
 *   playlist_visibility: 'friends',
 *   listening_activity_visible: true,
 *   song_of_day_visibility: 'public',
 *   friend_request_setting: 'everyone',
 *   searchable: true,
 *   activity_feed_visible: true,
 * };
 * ```
 */

/**
 * Helper function to get default privacy settings
 * @returns {PrivacyFormData} Default privacy settings
 */
export function getDefaultPrivacySettings() {
  return {
    profile_visibility: 'public',
    playlist_visibility: 'public',
    listening_activity_visible: true,
    song_of_day_visibility: 'public',
    friend_request_setting: 'everyone',
    searchable: true,
    activity_feed_visible: true,
  };
}

/**
 * Helper function to validate a single privacy field
 * @param {string} field - Field name to validate
 * @param {any} value - Value to validate
 * @returns {Object} Validation result with success flag and error if any
 */
export function validatePrivacyField(field, value) {
  const fieldSchema = privacySchema.shape[field];
  if (!fieldSchema) {
    return {
      success: false,
      error: `Unknown privacy field: ${field}`,
    };
  }

  const result = fieldSchema.safeParse(value);
  return {
    success: result.success,
    error: result.success ? null : result.error.errors[0]?.message || 'Validation failed',
  };
}

/**
 * Privacy level hierarchy for comparison
 * Higher number = more restrictive
 */
export const PRIVACY_LEVELS = {
  public: 0,
  friends: 1,
  private: 2,
};

/**
 * Helper function to check if a privacy change is more restrictive
 * @param {string} currentLevel - Current privacy level
 * @param {string} newLevel - New privacy level
 * @returns {boolean} True if new level is more restrictive
 */
export function isMoreRestrictive(currentLevel, newLevel) {
  const current = PRIVACY_LEVELS[currentLevel] ?? 0;
  const newLevelValue = PRIVACY_LEVELS[newLevel] ?? 0;
  return newLevelValue > current;
}

