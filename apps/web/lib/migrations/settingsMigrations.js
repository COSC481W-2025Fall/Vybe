/**
 * Settings Migration System
 * 
 * Handles settings schema changes over time by:
 * - Version tracking for settings schema
 * - Migration functions for each version upgrade
 * - Automatic migration on user login
 * - Backward compatibility for old settings
 * - Default values for new settings
 */

// Current settings schema version
export const CURRENT_SETTINGS_VERSION = 1;

// Version storage key
const VERSION_STORAGE_KEY = 'vybe-settings-version';

/**
 * Get stored settings version
 * @returns {number} Current version, or 0 if not set
 */
export function getStoredSettingsVersion() {
  if (typeof window === 'undefined') return 0;
  
  try {
    const version = localStorage.getItem(VERSION_STORAGE_KEY);
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    console.warn('[settings migration] Error reading version:', error);
    return 0;
  }
}

/**
 * Store settings version
 * @param {number} version - Version number to store
 */
export function storeSettingsVersion(version) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, version.toString());
  } catch (error) {
    console.warn('[settings migration] Error storing version:', error);
  }
}

/**
 * Migrate profile settings
 * @param {Object} profileData - Profile data to migrate
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @returns {Object} Migrated profile data
 */
function migrateProfile(profileData, fromVersion, toVersion) {
  let migrated = { ...profileData };

  // Version 0 -> 1
  if (fromVersion < 1 && toVersion >= 1) {
    // Ensure all required fields exist
    migrated = {
      display_name: migrated.display_name || '',
      bio: migrated.bio || '',
      username: migrated.username || migrated.display_name?.toLowerCase().replace(/\s+/g, '_') || '',
      profile_picture_url: migrated.profile_picture_url || null,
    };
  }

  // Future migrations can be added here
  // Version 1 -> 2, etc.

  return migrated;
}

/**
 * Migrate privacy settings
 * @param {Object} privacyData - Privacy data to migrate
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @returns {Object} Migrated privacy data
 */
function migratePrivacy(privacyData, fromVersion, toVersion) {
  let migrated = { ...privacyData };

  // Version 0 -> 1
  if (fromVersion < 1 && toVersion >= 1) {
    // Ensure all required fields exist with defaults
    migrated = {
      profile_visibility: migrated.profile_visibility || 'public',
      playlist_visibility: migrated.playlist_visibility || 'public',
      listening_activity: migrated.listening_activity || migrated.listening_activity_visible !== false ? 'public' : 'private',
      friend_list_visibility: migrated.friend_list_visibility || 'public',
      show_email: migrated.show_email || false,
      allow_friend_requests: migrated.allow_friend_requests !== undefined ? migrated.allow_friend_requests : true,
      allow_group_invites: migrated.allow_group_invites !== undefined ? migrated.allow_group_invites : true,
    };

    // Handle legacy field names
    if (migrated.listening_activity_visible !== undefined) {
      migrated.listening_activity = migrated.listening_activity_visible ? 'public' : 'private';
      delete migrated.listening_activity_visible;
    }

    if (migrated.searchable !== undefined) {
      // searchable was merged into profile_visibility
      if (!migrated.profile_visibility || migrated.profile_visibility === 'public') {
        migrated.profile_visibility = migrated.searchable ? 'public' : 'private';
      }
      delete migrated.searchable;
    }

    if (migrated.activity_feed_visible !== undefined) {
      // activity_feed_visible was merged into listening_activity
      if (!migrated.listening_activity || migrated.listening_activity === 'public') {
        migrated.listening_activity = migrated.activity_feed_visible ? 'public' : 'private';
      }
      delete migrated.activity_feed_visible;
    }

    if (migrated.friend_request_setting !== undefined) {
      // friend_request_setting was renamed to allow_friend_requests
      if (migrated.friend_request_setting === 'nobody') {
        migrated.allow_friend_requests = false;
      } else {
        migrated.allow_friend_requests = true;
      }
      delete migrated.friend_request_setting;
    }
  }

  // Future migrations can be added here

  return migrated;
}

/**
 * Migrate notification preferences
 * @param {Object} notificationData - Notification data to migrate
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @returns {Object} Migrated notification data
 */
function migrateNotifications(notificationData, fromVersion, toVersion) {
  let migrated = { ...notificationData };

  // Version 0 -> 1
  if (fromVersion < 1 && toVersion >= 1) {
    // Ensure all required fields exist with defaults
    migrated = {
      // Social notifications
      new_follower_in_app: migrated.new_follower_in_app !== undefined ? migrated.new_follower_in_app : true,
      new_follower_email: migrated.new_follower_email || false,
      friend_request_in_app: migrated.friend_request_in_app !== undefined ? migrated.friend_request_in_app : true,
      friend_request_email: migrated.friend_request_email || false,
      friend_accepted_in_app: migrated.friend_accepted_in_app !== undefined ? migrated.friend_accepted_in_app : true,
      friend_accepted_email: migrated.friend_accepted_email || false,
      
      // Playlist notifications
      playlist_shared_in_app: migrated.playlist_shared_in_app !== undefined ? migrated.playlist_shared_in_app : true,
      playlist_shared_email: migrated.playlist_shared_email || false,
      playlist_collaboration_in_app: migrated.playlist_collaboration_in_app !== undefined ? migrated.playlist_collaboration_in_app : true,
      playlist_collaboration_email: migrated.playlist_collaboration_email || false,
      
      // System notifications
      security_alert_in_app: true, // Always enabled
      security_alert_email: true, // Always enabled
      system_update_in_app: migrated.system_update_in_app !== undefined ? migrated.system_update_in_app : true,
      system_update_email: migrated.system_update_email || false,
      
      // Email frequency
      email_frequency: migrated.email_frequency || 'instant',
    };

    // Handle legacy field names or missing fields
    // Map old notification structure if needed
    if (migrated.notifications_enabled !== undefined) {
      // If global notifications were disabled, disable all in-app notifications
      if (!migrated.notifications_enabled) {
        migrated.new_follower_in_app = false;
        migrated.friend_request_in_app = false;
        migrated.friend_accepted_in_app = false;
        migrated.playlist_shared_in_app = false;
        migrated.playlist_collaboration_in_app = false;
        migrated.system_update_in_app = false;
      }
      delete migrated.notifications_enabled;
    }
  }

  // Future migrations can be added here

  return migrated;
}

/**
 * Migrate settings from one version to another
 * @param {Object} settings - Settings object with profile, privacy, notifications
 * @param {number} fromVersion - Source version (default: detected from storage)
 * @param {number} toVersion - Target version (default: CURRENT_SETTINGS_VERSION)
 * @returns {Object} Migrated settings
 */
export function migrateSettings(settings, fromVersion = null, toVersion = CURRENT_SETTINGS_VERSION) {
  // Detect version if not provided
  if (fromVersion === null) {
    fromVersion = getStoredSettingsVersion();
  }

  // If already at target version, no migration needed
  if (fromVersion >= toVersion) {
    return settings;
  }

  console.log(`[settings migration] Migrating from version ${fromVersion} to ${toVersion}`);

  const migrated = {
    profile: settings.profile ? migrateProfile(settings.profile, fromVersion, toVersion) : null,
    privacy: settings.privacy ? migratePrivacy(settings.privacy, fromVersion, toVersion) : null,
    notifications: settings.notifications ? migrateNotifications(settings.notifications, fromVersion, toVersion) : null,
  };

  // Store new version
  storeSettingsVersion(toVersion);

  return migrated;
}

/**
 * Check if migration is needed
 * @returns {boolean} True if migration is needed
 */
export function needsMigration() {
  const storedVersion = getStoredSettingsVersion();
  return storedVersion < CURRENT_SETTINGS_VERSION;
}

/**
 * Run automatic migration on user login/data load
 * @param {Object} settings - Current settings from API
 * @returns {Object} Migrated settings
 */
export function autoMigrateSettings(settings) {
  const storedVersion = getStoredSettingsVersion();
  
  if (storedVersion < CURRENT_SETTINGS_VERSION) {
    console.log('[settings migration] Running automatic migration');
    return migrateSettings(settings, storedVersion, CURRENT_SETTINGS_VERSION);
  }
  
  return settings;
}

/**
 * Test migration with mock data
 * @param {Object} mockSettings - Mock settings data
 * @param {number} fromVersion - Source version
 * @returns {Object} Migration test result
 */
export function testMigration(mockSettings, fromVersion = 0) {
  try {
    console.log(`[settings migration] Testing migration from version ${fromVersion}`);
    
    const migrated = migrateSettings(mockSettings, fromVersion, CURRENT_SETTINGS_VERSION);
    
    // Validate migrated data structure
    const isValid = validateMigratedSettings(migrated);
    
    return {
      success: isValid,
      migrated,
      fromVersion,
      toVersion: CURRENT_SETTINGS_VERSION,
      errors: isValid ? [] : ['Migration validation failed'],
    };
  } catch (error) {
    console.error('[settings migration] Migration test failed:', error);
    return {
      success: false,
      migrated: null,
      fromVersion,
      toVersion: CURRENT_SETTINGS_VERSION,
      errors: [error.message],
    };
  }
}

/**
 * Validate migrated settings structure
 * @param {Object} settings - Settings to validate
 * @returns {boolean} True if valid
 */
function validateMigratedSettings(settings) {
  // Basic structure validation
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // Profile validation
  if (settings.profile) {
    const requiredProfileFields = ['display_name', 'bio', 'username', 'profile_picture_url'];
    for (const field of requiredProfileFields) {
      if (!(field in settings.profile)) {
        console.warn(`[settings migration] Missing profile field: ${field}`);
        return false;
      }
    }
  }

  // Privacy validation
  if (settings.privacy) {
    const requiredPrivacyFields = [
      'profile_visibility',
      'playlist_visibility',
      'listening_activity',
      'friend_list_visibility',
      'show_email',
      'allow_friend_requests',
      'allow_group_invites',
    ];
    for (const field of requiredPrivacyFields) {
      if (!(field in settings.privacy)) {
        console.warn(`[settings migration] Missing privacy field: ${field}`);
        return false;
      }
    }
  }

  // Notifications validation
  if (settings.notifications) {
    const requiredNotificationFields = [
      'new_follower_in_app',
      'new_follower_email',
      'friend_request_in_app',
      'friend_request_email',
      'friend_accepted_in_app',
      'friend_accepted_email',
      'playlist_shared_in_app',
      'playlist_shared_email',
      'playlist_collaboration_in_app',
      'playlist_collaboration_email',
      'security_alert_in_app',
      'security_alert_email',
      'system_update_in_app',
      'system_update_email',
      'email_frequency',
    ];
    for (const field of requiredNotificationFields) {
      if (!(field in settings.notifications)) {
        console.warn(`[settings migration] Missing notification field: ${field}`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Create mock settings for testing
 * @param {number} version - Version to create mock for
 * @returns {Object} Mock settings
 */
export function createMockSettings(version = 0) {
  if (version === 0) {
    // Legacy format (before migrations)
    return {
      profile: {
        display_name: 'Test User',
        // Missing bio, username, profile_picture_url
      },
      privacy: {
        listening_activity_visible: true,
        searchable: true,
        activity_feed_visible: true,
        friend_request_setting: 'everyone',
        // Missing new field names
      },
      notifications: {
        notifications_enabled: true,
        // Missing specific notification fields
      },
    };
  }

  // Current format
  return {
    profile: {
      display_name: 'Test User',
      bio: 'Test bio',
      username: 'test_user',
      profile_picture_url: null,
    },
    privacy: {
      profile_visibility: 'public',
      playlist_visibility: 'public',
      listening_activity: 'public',
      friend_list_visibility: 'public',
      show_email: false,
      allow_friend_requests: true,
      allow_group_invites: true,
    },
    notifications: {
      new_follower_in_app: true,
      new_follower_email: false,
      friend_request_in_app: true,
      friend_request_email: false,
      friend_accepted_in_app: true,
      friend_accepted_email: false,
      playlist_shared_in_app: true,
      playlist_shared_email: false,
      playlist_collaboration_in_app: true,
      playlist_collaboration_email: false,
      security_alert_in_app: true,
      security_alert_email: true,
      system_update_in_app: true,
      system_update_email: false,
      email_frequency: 'instant',
    },
  };
}

