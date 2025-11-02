'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseBrowser } from '@/lib/supabase/client';
import useSettingsStore from '@/store/settingsStore';
import { invalidateOnRealtimeUpdate } from '@/lib/cache/settingsCache';

/**
 * Settings Sync Hook
 * 
 * Syncs settings across tabs/devices using Supabase realtime subscriptions.
 * Features:
 * - Realtime subscriptions to settings tables
 * - Update local state when remote changes detected
 * - Show notification when settings updated elsewhere
 * - Handle offline/online state
 * - Queue updates when offline, sync when back online
 * - Resolve conflicts (last write wins or user choice)
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable/disable sync (default: true)
 * @param {boolean} options.showNotifications - Show toast notifications (default: true)
 * @param {string} options.conflictResolution - 'remote', 'local', or 'prompt' (default: 'remote')
 * @returns {Object} Sync state and controls
 */
export function useSettingsSync(options = {}) {
  const {
    enabled = true,
    showNotifications = true,
    conflictResolution = 'remote', // 'remote', 'local', 'prompt'
  } = options;

  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [queuedUpdates, setQueuedUpdates] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const store = useSettingsStore();
  const queryClient = useQueryClient();
  const subscriptionsRef = useRef([]);
  const userIdRef = useRef(null);
  const lastSyncRef = useRef({
    profile: null,
    privacy: null,
    notifications: null,
  });

  // Track online/offline state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Sync queued updates when coming back online
      if (queuedUpdates.length > 0) {
        processQueuedUpdates();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queuedUpdates]);

  // Get current user
  useEffect(() => {
    if (!enabled) return;

    const getUserId = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.warn('[settings sync] No authenticated user');
          return;
        }
        
        userIdRef.current = user.id;
        setupSubscriptions(user.id);
      } catch (error) {
        console.error('[settings sync] Error getting user:', error);
      }
    };

    getUserId();

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach((subscription) => {
        if (subscription) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current = [];
    };
  }, [enabled]);

  // Setup Supabase realtime subscriptions
  const setupSubscriptions = (userId) => {
    const supabase = supabaseBrowser();

    // Cleanup existing subscriptions
    subscriptionsRef.current.forEach((sub) => {
      if (sub) sub.unsubscribe();
    });
    subscriptionsRef.current = [];

    // Subscribe to profile changes (users table)
    const profileSubscription = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          handleSettingsChange('profile', payload, userId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[settings sync] Profile subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[settings sync] Profile subscription error');
        }
      });

    // Subscribe to privacy settings changes
    const privacySubscription = supabase
      .channel(`privacy-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_privacy_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          handleSettingsChange('privacy', payload, userId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[settings sync] Privacy subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[settings sync] Privacy subscription error');
        }
      });

    // Subscribe to notification preferences changes
    const notificationsSubscription = supabase
      .channel(`notifications-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notification_preferences',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          handleSettingsChange('notifications', payload, userId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[settings sync] Notifications subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[settings sync] Notifications subscription error');
        }
      });

    subscriptionsRef.current = [
      profileSubscription,
      privacySubscription,
      notificationsSubscription,
    ];
  };

  // Handle settings change from realtime
  const handleSettingsChange = async (type, payload, userId) => {
    try {
      // Ignore if this is our own change (check last sync timestamp)
      const lastSync = lastSyncRef.current[type];
      const now = new Date().toISOString();
      const eventTimestamp = payload.commit_timestamp || now;

      // Skip if this is likely our own update (within 1 second of our last sync)
      if (lastSync && eventTimestamp) {
        const timeDiff = new Date(eventTimestamp) - new Date(lastSync);
        if (timeDiff < 1000) {
          console.log(`[settings sync] Ignoring own ${type} update`);
          return;
        }
      }

      // If offline, queue the update
      if (!isOnline) {
        setQueuedUpdates((prev) => [...prev, { type, payload, timestamp: now }]);
        return;
      }

      // Fetch fresh data from API
      const freshData = await fetchSettingsData(type, userId);
      
      if (!freshData) {
        console.warn(`[settings sync] Failed to fetch ${type} data`);
        return;
      }

      // Check for conflicts
      const hasConflict = checkConflict(type, freshData);
      
      if (hasConflict) {
        await handleConflict(type, freshData);
      } else {
        // No conflict, update store
        updateStoreWithRemoteData(type, freshData);
        
        // Invalidate cache on realtime update
        invalidateOnRealtimeUpdate(queryClient, type);
        
        if (showNotifications) {
          showSettingsUpdatedNotification(type);
        }
      }
    } catch (error) {
      console.error(`[settings sync] Error handling ${type} change:`, error);
    }
  };

  // Fetch fresh settings data from API
  const fetchSettingsData = async (type, userId) => {
    try {
      let endpoint;
      
      switch (type) {
        case 'profile':
          endpoint = '/api/user/profile';
          break;
        case 'privacy':
          endpoint = '/api/user/privacy';
          break;
        case 'notifications':
          endpoint = '/api/user/notifications';
          break;
        default:
          return null;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} settings`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[settings sync] Error fetching ${type}:`, error);
      return null;
    }
  };

  // Check if there's a conflict between local and remote data
  const checkConflict = (type, remoteData) => {
    const storeState = useSettingsStore.getState();
    let localData;
    
    switch (type) {
      case 'profile':
        localData = storeState.profile;
        break;
      case 'privacy':
        localData = storeState.privacy;
        break;
      case 'notifications':
        localData = storeState.notifications;
        break;
      default:
        return false;
    }
    
    const isDirty = storeState.isDirty[type];
    
    // If local isn't dirty, no conflict
    if (!isDirty) {
      return false;
    }

    // Check if data has actually changed (simple comparison)
    // In production, you might want more sophisticated conflict detection
    const localString = JSON.stringify(localData);
    const remoteString = JSON.stringify(remoteData);
    
    return localString !== remoteString;
  };

  // Handle conflict resolution
  const handleConflict = async (type, remoteData) => {
    const storeState = useSettingsStore.getState();
    let localData;
    
    switch (type) {
      case 'profile':
        localData = storeState.profile;
        break;
      case 'privacy':
        localData = storeState.privacy;
        break;
      case 'notifications':
        localData = storeState.notifications;
        break;
      default:
        return;
    }

    if (conflictResolution === 'remote') {
      // Last write wins (remote)
      updateStoreWithRemoteData(type, remoteData);
      
      if (showNotifications) {
        showConflictResolvedNotification(type, 'remote');
      }
    } else if (conflictResolution === 'local') {
      // Keep local changes
      // Don't update store, but mark conflict
      useSettingsStore.setState((state) => ({
        conflicts: {
          ...state.conflicts,
          [type]: {
            local: localData,
            remote: remoteData,
            detectedAt: new Date().toISOString(),
          },
        },
      }));
      
      if (showNotifications) {
        showConflictNotification(type);
      }
    } else if (conflictResolution === 'prompt') {
      // Show conflict notification (UI should prompt user)
      useSettingsStore.setState((state) => ({
        conflicts: {
          ...state.conflicts,
          [type]: {
            local: localData,
            remote: remoteData,
            detectedAt: new Date().toISOString(),
          },
        },
      }));
      
      if (showNotifications) {
        showConflictPromptNotification(type);
      }
    }
  };

  // Update store with remote data
  const updateStoreWithRemoteData = (type, remoteData) => {
    const storeState = useSettingsStore.getState();
    
    switch (type) {
      case 'profile':
        storeState.setProfile(remoteData, { optimistic: false, skipDirty: true });
        break;
      case 'privacy':
        storeState.setPrivacy(remoteData, { optimistic: false, skipDirty: true });
        break;
      case 'notifications':
        storeState.setNotifications(remoteData, { optimistic: false, skipDirty: true });
        break;
    }
    
    // Update last sync timestamp
    lastSyncRef.current[type] = new Date().toISOString();
  };

  // Process queued updates when coming back online
  const processQueuedUpdates = async () => {
    if (!isOnline || queuedUpdates.length === 0) return;
    
    setIsSyncing(true);
    
    try {
      const updates = [...queuedUpdates];
      setQueuedUpdates([]);
      
      for (const update of updates) {
        const userId = userIdRef.current;
        if (!userId) continue;
        
        const freshData = await fetchSettingsData(update.type, userId);
        if (freshData) {
          updateStoreWithRemoteData(update.type, freshData);
        }
      }
      
      if (showNotifications && updates.length > 0) {
        showSyncCompleteNotification(updates.length);
      }
    } catch (error) {
      console.error('[settings sync] Error processing queued updates:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Show toast notifications
  const showSettingsUpdatedNotification = (type) => {
    const typeLabels = {
      profile: 'Profile',
      privacy: 'Privacy settings',
      notifications: 'Notification preferences',
    };
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'info',
          message: `${typeLabels[type]} were updated on another device`,
        },
      }));
    }
  };

  const showConflictNotification = (type) => {
    const typeLabels = {
      profile: 'Profile',
      privacy: 'Privacy settings',
      notifications: 'Notification preferences',
    };
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'warning',
          message: `Conflict detected in ${typeLabels[type]}. Local changes preserved.`,
        },
      }));
    }
  };

  const showConflictPromptNotification = (type) => {
    const typeLabels = {
      profile: 'Profile',
      privacy: 'Privacy settings',
      notifications: 'Notification preferences',
    };
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'warning',
          message: `Conflict in ${typeLabels[type]}. Please resolve manually.`,
          duration: 10000, // Longer duration for conflict
        },
      }));
    }
  };

  const showConflictResolvedNotification = (type, resolution) => {
    const typeLabels = {
      profile: 'Profile',
      privacy: 'Privacy settings',
      notifications: 'Notification preferences',
    };
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'info',
          message: `${typeLabels[type]} updated from another device (${resolution} changes kept)`,
        },
      }));
    }
  };

  const showSyncCompleteNotification = (count) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'success',
          message: `Synced ${count} setting update${count > 1 ? 's' : ''} from offline queue`,
        },
      }));
    }
  };

  return {
    isOnline,
    isSyncing,
    queuedUpdatesCount: queuedUpdates.length,
    subscriptionsActive: subscriptionsRef.current.length > 0,
    processQueuedUpdates,
  };
}

