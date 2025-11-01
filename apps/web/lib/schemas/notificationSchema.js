import { z } from 'zod';

/**
 * Notification preferences validation schema using Zod
 * 
 * Validates:
 * - Social notifications (friend requests, new followers, comments)
 * - Playlist notifications (invites, updates)
 * - System notifications (song of day, announcements, security alerts)
 * - Email frequency settings
 * - Master notification toggle
 * 
 * @typedef {Object} NotificationFormData
 * @property {boolean} friend_requests_inapp - In-app notifications for friend requests
 * @property {boolean} friend_requests_email - Email notifications for friend requests
 * @property {boolean} new_followers_inapp - In-app notifications for new followers
 * @property {boolean} new_followers_email - Email notifications for new followers
 * @property {boolean} comments_inapp - In-app notifications for comments/reactions
 * @property {boolean} comments_email - Email notifications for comments/reactions
 * @property {boolean} playlist_invites_inapp - In-app notifications for playlist invites
 * @property {boolean} playlist_invites_email - Email notifications for playlist invites
 * @property {boolean} playlist_updates_inapp - In-app notifications for playlist updates
 * @property {boolean} playlist_updates_email - Email notifications for playlist updates
 * @property {boolean} song_of_day_inapp - In-app notifications for friends' Song of the Day
 * @property {boolean} song_of_day_email - Email notifications for friends' Song of the Day
 * @property {boolean} system_announcements_inapp - In-app notifications for system announcements
 * @property {boolean} system_announcements_email - Email notifications for system announcements
 * @property {boolean} security_alerts_inapp - In-app notifications for security alerts (always true)
 * @property {boolean} security_alerts_email - Email notifications for security alerts (always true)
 * @property {string} email_frequency - Email frequency (instant, daily, weekly)
 * @property {boolean} notifications_enabled - Master toggle for notifications
 */

/**
 * Email frequency enum:
 * - instant: Receive emails immediately
 * - daily: Daily digest (one email per day)
 * - weekly: Weekly summary (one email per week)
 */
const emailFrequencySchema = z.enum(['instant', 'daily', 'weekly'], {
  required_error: 'Email frequency is required',
  invalid_type_error: 'Email frequency must be one of: instant, daily, or weekly',
});

/**
 * Boolean schema for notification toggles:
 * - Must be a boolean value
 */
const notificationToggleSchema = z.boolean({
  required_error: 'This notification setting requires a boolean value',
  invalid_type_error: 'This notification setting must be true or false',
});

/**
 * Social Notifications
 */
const friendRequestsInAppSchema = notificationToggleSchema;
const friendRequestsEmailSchema = notificationToggleSchema;
const newFollowersInAppSchema = notificationToggleSchema;
const newFollowersEmailSchema = notificationToggleSchema;
const commentsInAppSchema = notificationToggleSchema;
const commentsEmailSchema = notificationToggleSchema;

/**
 * Playlist Notifications
 */
const playlistInvitesInAppSchema = notificationToggleSchema;
const playlistInvitesEmailSchema = notificationToggleSchema;
const playlistUpdatesInAppSchema = notificationToggleSchema;
const playlistUpdatesEmailSchema = notificationToggleSchema;

/**
 * System Notifications
 */
const songOfDayInAppSchema = notificationToggleSchema;
const songOfDayEmailSchema = notificationToggleSchema;
const systemAnnouncementsInAppSchema = notificationToggleSchema;
const systemAnnouncementsEmailSchema = notificationToggleSchema;

/**
 * Security Alerts (Required - Always Enabled)
 * These must always be true and cannot be disabled
 */
const securityAlertsInAppSchema = z.boolean({
  required_error: 'Security alerts in-app must be enabled',
  invalid_type_error: 'Security alerts in-app must be true',
}).refine((val) => val === true, {
  message: 'Security alerts must always be enabled',
});

const securityAlertsEmailSchema = z.boolean({
  required_error: 'Security alerts email must be enabled',
  invalid_type_error: 'Security alerts email must be true',
}).refine((val) => val === true, {
  message: 'Security alerts must always be enabled',
});

/**
 * Master toggle for notifications
 */
const notificationsEnabledSchema = z.boolean({
  required_error: 'Notifications enabled setting is required',
  invalid_type_error: 'Notifications enabled must be true or false',
});

/**
 * Notification preferences validation schema
 * 
 * This schema validates all notification preferences and ensures:
 * - All required fields are present
 * - Boolean values are properly typed
 * - Security alerts are always enabled
 * - Email frequency is valid
 * 
 * Usage:
 * ```javascript
 * import { notificationSchema } from '@/lib/schemas/notificationSchema';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * 
 * const form = useForm({
 *   resolver: zodResolver(notificationSchema),
 *   defaultValues: getDefaultNotificationPreferences(),
 * });
 * ```
 */
export const notificationSchema = z.object({
  // Social Notifications
  friend_requests_inapp: friendRequestsInAppSchema,
  friend_requests_email: friendRequestsEmailSchema,
  new_followers_inapp: newFollowersInAppSchema,
  new_followers_email: newFollowersEmailSchema,
  comments_inapp: commentsInAppSchema,
  comments_email: commentsEmailSchema,
  
  // Playlist Notifications
  playlist_invites_inapp: playlistInvitesInAppSchema,
  playlist_invites_email: playlistInvitesEmailSchema,
  playlist_updates_inapp: playlistUpdatesInAppSchema,
  playlist_updates_email: playlistUpdatesEmailSchema,
  
  // System Notifications
  song_of_day_inapp: songOfDayInAppSchema,
  song_of_day_email: songOfDayEmailSchema,
  system_announcements_inapp: systemAnnouncementsInAppSchema,
  system_announcements_email: systemAnnouncementsEmailSchema,
  security_alerts_inapp: securityAlertsInAppSchema,
  security_alerts_email: securityAlertsEmailSchema,
  
  // Email Frequency
  email_frequency: emailFrequencySchema,
  
  // Master Toggle
  notifications_enabled: notificationsEnabledSchema,
})
.refine(
  /**
   * Ensure security alerts are always enabled
   */
  (data) => {
    return data.security_alerts_inapp === true && data.security_alerts_email === true;
  },
  {
    message: 'Security alerts must always be enabled for both in-app and email channels',
    path: ['security_alerts_inapp'], // Attach error to security_alerts_inapp field
  }
);

/**
 * Partial notification schema for updates:
 * - Allows updating only specific fields
 * - Useful for PATCH operations
 */
export const notificationPartialSchema = notificationSchema.partial();

/**
 * TypeScript/JSDoc type definitions
 * 
 * @typedef {z.infer<typeof notificationSchema>} NotificationFormData
 * @typedef {z.infer<typeof notificationPartialSchema>} NotificationPartialFormData
 * 
 * Example usage in JavaScript with JSDoc:
 * ```javascript
 * /**
 *  * @type {import('@/lib/schemas/notificationSchema').NotificationFormData}
 *  *\/
 * const notificationData = {
 *   friend_requests_inapp: true,
 *   friend_requests_email: true,
 *   // ... other fields
 * };
 * ```
 */

/**
 * Helper function to get default notification preferences
 * @returns {NotificationFormData} Default notification preferences
 */
export function getDefaultNotificationPreferences() {
  return {
    // Social Notifications
    friend_requests_inapp: true,
    friend_requests_email: true,
    new_followers_inapp: true,
    new_followers_email: false,
    comments_inapp: true,
    comments_email: false,
    
    // Playlist Notifications
    playlist_invites_inapp: true,
    playlist_invites_email: true,
    playlist_updates_inapp: true,
    playlist_updates_email: false,
    
    // System Notifications
    song_of_day_inapp: true,
    song_of_day_email: false,
    system_announcements_inapp: true,
    system_announcements_email: true,
    security_alerts_inapp: true, // Always enabled
    security_alerts_email: true, // Always enabled
    
    // Email Frequency
    email_frequency: 'instant',
    
    // Master Toggle
    notifications_enabled: true,
  };
}

/**
 * Helper function to validate a single notification field
 * @param {string} field - Field name to validate
 * @param {any} value - Value to validate
 * @returns {Object} Validation result with success flag and error if any
 */
export function validateNotificationField(field, value) {
  const fieldSchema = notificationSchema.shape[field];
  if (!fieldSchema) {
    return {
      success: false,
      error: `Unknown notification field: ${field}`,
    };
  }

  const result = fieldSchema.safeParse(value);
  return {
    success: result.success,
    error: result.success ? null : result.error.errors[0]?.message || 'Validation failed',
  };
}

/**
 * Helper function to check if security alerts can be disabled
 * @param {Object} data - Notification preferences data
 * @returns {boolean} True if security alerts are properly enabled
 */
export function areSecurityAlertsEnabled(data) {
  return data.security_alerts_inapp === true && data.security_alerts_email === true;
}

