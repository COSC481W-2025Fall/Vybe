/**
 * Settings Conflict Resolution Utility
 * 
 * Handles conflicts when settings are updated from multiple sources (multiple tabs/devices).
 * 
 * Features:
 * - Detect conflicts between local and remote settings
 * - Implement multiple resolution strategies
 * - Merge non-conflicting changes
 * - Log conflicts for debugging
 * - Prevent data loss
 */

/**
 * Conflict resolution strategies
 */
export const ConflictResolutionStrategy = {
  /** Last write wins - remote changes take precedence */
  REMOTE: 'remote',
  
  /** Local changes take precedence */
  LOCAL: 'local',
  
  /** User chooses which version to keep */
  USER_CHOICE: 'user_choice',
  
  /** Merge non-conflicting changes, prompt for conflicts */
  MERGE: 'merge',
  
  /** Last write wins (default) */
  DEFAULT: 'remote',
};

/**
 * Detect conflicts between local and remote settings
 * 
 * @param {string} type - Settings type ('profile', 'privacy', 'notifications')
 * @param {Object} localData - Local settings data
 * @param {Object} remoteData - Remote settings data
 * @returns {Object} Conflict detection result
 */
export function detectConflict(type, localData, remoteData) {
  if (!localData || !remoteData) {
    return {
      hasConflict: false,
      conflictingFields: [],
      localOnly: [],
      remoteOnly: [],
    };
  }

  const conflictingFields = [];
  const localOnly = [];
  const remoteOnly = [];

  // Compare all fields
  const allKeys = new Set([
    ...Object.keys(localData || {}),
    ...Object.keys(remoteData || {}),
  ]);

  for (const key of allKeys) {
    const localValue = localData[key];
    const remoteValue = remoteData[key];

    // Field exists in both but values differ
    if (
      localData.hasOwnProperty(key) &&
      remoteData.hasOwnProperty(key) &&
      !valuesEqual(localValue, remoteValue)
    ) {
      conflictingFields.push({
        field: key,
        local: localValue,
        remote: remoteValue,
      });
    }
    // Field only in local
    else if (
      localData.hasOwnProperty(key) &&
      !remoteData.hasOwnProperty(key)
    ) {
      localOnly.push(key);
    }
    // Field only in remote
    else if (
      !localData.hasOwnProperty(key) &&
      remoteData.hasOwnProperty(key)
    ) {
      remoteOnly.push(key);
    }
  }

  return {
    hasConflict: conflictingFields.length > 0 || localOnly.length > 0 || remoteOnly.length > 0,
    conflictingFields,
    localOnly,
    remoteOnly,
  };
}

/**
 * Check if two values are equal (deep comparison)
 * 
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} True if values are equal
 */
function valuesEqual(a, b) {
  // Handle null/undefined
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }

  // Handle primitives
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => valuesEqual(item, b[index]));
  }

  // Handle objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => valuesEqual(a[key], b[key]));
}

/**
 * Resolve conflict using last write wins strategy (remote wins)
 * 
 * @param {string} type - Settings type
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @returns {Object} Resolved data
 */
export function resolveConflictRemote(type, localData, remoteData) {
  logConflictResolution(type, 'remote', localData, remoteData, remoteData);
  return remoteData;
}

/**
 * Resolve conflict using local wins strategy
 * 
 * @param {string} type - Settings type
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @returns {Object} Resolved data
 */
export function resolveConflictLocal(type, localData, remoteData) {
  logConflictResolution(type, 'local', localData, remoteData, localData);
  return localData;
}

/**
 * Merge non-conflicting changes from local and remote
 * 
 * @param {string} type - Settings type
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @returns {Object} Merged data and remaining conflicts
 */
export function mergeNonConflictingChanges(type, localData, remoteData) {
  const conflict = detectConflict(type, localData, remoteData);
  
  // Start with remote as base (last write wins for conflicts)
  const merged = { ...remoteData };

  // Add fields that only exist in local (no conflict)
  for (const field of conflict.localOnly) {
    merged[field] = localData[field];
  }

  // For conflicting fields, we can't auto-merge - keep remote (user will be prompted)
  // The conflictingFields array will be returned for user resolution

  logConflictResolution(
    type,
    'merge',
    localData,
    remoteData,
    merged,
    conflict.conflictingFields
  );

  return {
    merged,
    conflicts: conflict.conflictingFields,
    needsUserInput: conflict.conflictingFields.length > 0,
  };
}

/**
 * Resolve conflict using user choice
 * 
 * @param {string} type - Settings type
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @param {string} userChoice - 'local' or 'remote'
 * @returns {Object} Resolved data
 */
export function resolveConflictUserChoice(type, localData, remoteData, userChoice) {
  const resolved = userChoice === 'local' ? localData : remoteData;
  logConflictResolution(type, `user_choice:${userChoice}`, localData, remoteData, resolved);
  return resolved;
}

/**
 * Resolve conflict based on strategy
 * 
 * @param {string} type - Settings type
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @param {string} strategy - Resolution strategy
 * @param {string} [userChoice] - User choice if strategy is USER_CHOICE
 * @returns {Object} Resolution result
 */
export function resolveConflict(type, localData, remoteData, strategy, userChoice = null) {
  switch (strategy) {
    case ConflictResolutionStrategy.REMOTE:
      return {
        resolved: resolveConflictRemote(type, localData, remoteData),
        strategy: 'remote',
        requiresUserInput: false,
      };

    case ConflictResolutionStrategy.LOCAL:
      return {
        resolved: resolveConflictLocal(type, localData, remoteData),
        strategy: 'local',
        requiresUserInput: false,
      };

    case ConflictResolutionStrategy.MERGE:
      const mergeResult = mergeNonConflictingChanges(type, localData, remoteData);
      return {
        resolved: mergeResult.merged,
        strategy: 'merge',
        requiresUserInput: mergeResult.needsUserInput,
        conflicts: mergeResult.conflicts,
      };

    case ConflictResolutionStrategy.USER_CHOICE:
      if (!userChoice) {
        // User hasn't chosen yet, return conflict info
        return {
          resolved: null,
          strategy: 'user_choice',
          requiresUserInput: true,
          localData,
          remoteData,
        };
      }
      return {
        resolved: resolveConflictUserChoice(type, localData, remoteData, userChoice),
        strategy: `user_choice:${userChoice}`,
        requiresUserInput: false,
      };

    default:
      // Default to remote (last write wins)
      return {
        resolved: resolveConflictRemote(type, localData, remoteData),
        strategy: 'remote',
        requiresUserInput: false,
      };
  }
}

/**
 * Log conflict detection and resolution for debugging
 * 
 * @param {string} type - Settings type
 * @param {string} strategy - Resolution strategy used
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @param {Object} resolvedData - Resolved data
 * @param {Array} [remainingConflicts] - Remaining conflicts if merging
 */
function logConflictResolution(type, strategy, localData, remoteData, resolvedData, remainingConflicts = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    strategy,
    conflict: {
      local: localData,
      remote: remoteData,
      resolved: resolvedData,
    },
    remainingConflicts,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Conflict Resolution]', logEntry);
  }

  // In production, you might want to send this to an analytics service
  // For example: trackEvent('settings_conflict_resolved', logEntry);

  // Store in localStorage for debugging (last 10 conflicts)
  try {
    const existing = localStorage.getItem('settings_conflict_log');
    const logs = existing ? JSON.parse(existing) : [];
    
    logs.unshift(logEntry);
    if (logs.length > 10) {
      logs.pop(); // Keep only last 10
    }
    
    localStorage.setItem('settings_conflict_log', JSON.stringify(logs));
  } catch (error) {
    // localStorage might not be available or full
    console.warn('[Conflict Resolution] Failed to log to localStorage:', error);
  }
}

/**
 * Get conflict log from localStorage
 * 
 * @returns {Array} Array of conflict log entries
 */
export function getConflictLog() {
  try {
    const existing = localStorage.getItem('settings_conflict_log');
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.warn('[Conflict Resolution] Failed to read conflict log:', error);
    return [];
  }
}

/**
 * Clear conflict log
 */
export function clearConflictLog() {
  try {
    localStorage.removeItem('settings_conflict_log');
  } catch (error) {
    console.warn('[Conflict Resolution] Failed to clear conflict log:', error);
  }
}

/**
 * Format conflict for display to user
 * 
 * @param {string} type - Settings type
 * @param {Object} conflict - Conflict detection result
 * @returns {Object} Formatted conflict info
 */
export function formatConflictForDisplay(type, conflict) {
  const typeLabels = {
    profile: 'Profile Settings',
    privacy: 'Privacy Settings',
    notifications: 'Notification Preferences',
  };

  return {
    type,
    typeLabel: typeLabels[type] || type,
    hasConflict: conflict.hasConflict,
    conflictingFields: conflict.conflictingFields,
    conflictingFieldsCount: conflict.conflictingFields.length,
    summary: conflict.conflictingFields.length > 0
      ? `${conflict.conflictingFields.length} field${conflict.conflictingFields.length > 1 ? 's' : ''} have conflicting values`
      : 'No conflicts detected',
  };
}

/**
 * Check if conflict resolution would result in data loss
 * 
 * @param {string} type - Settings type
 * @param {Object} localData - Local settings
 * @param {Object} remoteData - Remote settings
 * @param {string} strategy - Resolution strategy
 * @returns {Object} Data loss analysis
 */
export function analyzeDataLoss(type, localData, remoteData, strategy) {
  const conflict = detectConflict(type, localData, remoteData);
  
  if (strategy === ConflictResolutionStrategy.REMOTE) {
    // Remote wins - check which local changes would be lost
    const lostChanges = conflict.conflictingFields
      .map((field) => ({
        field: field.field,
        localValue: field.local,
        remoteValue: field.remote,
      }));

    return {
      willLoseData: lostChanges.length > 0,
      lostChanges,
      lostFieldsCount: lostChanges.length,
    };
  }

  if (strategy === ConflictResolutionStrategy.LOCAL) {
    // Local wins - check which remote changes would be lost
    const lostChanges = conflict.conflictingFields
      .map((field) => ({
        field: field.field,
        localValue: field.local,
        remoteValue: field.remote,
      }));

    return {
      willLoseData: lostChanges.length > 0,
      lostChanges,
      lostFieldsCount: lostChanges.length,
    };
  }

  // Merge strategy - analyze what can be merged vs what needs user input
  const mergeResult = mergeNonConflictingChanges(type, localData, remoteData);
  
  return {
    willLoseData: false, // Merge doesn't lose data, but may need user input
    canMerge: mergeResult.conflicts.length === 0,
    needsUserInput: mergeResult.needsUserInput,
    conflicts: mergeResult.conflicts,
  };
}

