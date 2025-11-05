'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Unified Settings Store
 * 
 * Centralized state management for all user settings (profile, privacy, notifications)
 * with persistence, optimistic updates, and conflict resolution.
 */

// Default values for settings
const defaultProfile = {
  display_name: '',
  bio: '',
  username: '',
  profile_picture_url: null,
};

const defaultPrivacy = {
  profile_visibility: 'public',
  playlist_visibility: 'public',
  listening_activity: 'public',
  friend_list_visibility: 'public',
  show_email: false,
  allow_friend_requests: true,
  allow_group_invites: true,
};

const defaultNotifications = {
  // Social notifications
  new_follower_in_app: true,
  new_follower_email: false,
  friend_request_in_app: true,
  friend_request_email: false,
  friend_accepted_in_app: true,
  friend_accepted_email: false,
  
  // Playlist notifications
  playlist_shared_in_app: true,
  playlist_shared_email: false,
  playlist_collaboration_in_app: true,
  playlist_collaboration_email: false,
  
  // System notifications
  security_alert_in_app: true,
  security_alert_email: true, // Always enabled
  system_update_in_app: true,
  system_update_email: false,
  
  // Email frequency
  email_frequency: 'instant',
};

/**
 * Settings Store
 * 
 * Manages all user settings in a unified store with:
 * - Local persistence to localStorage
 * - Optimistic updates
 * - Sync with API
 * - Conflict resolution
 */
const useSettingsStore = create(
  persist(
    (set, get) => ({
      // State
      profile: defaultProfile,
      privacy: defaultPrivacy,
      notifications: defaultNotifications,
      
      // Loading states
      isLoading: {
        profile: false,
        privacy: false,
        notifications: false,
      },
      
      // Save states
      isSaving: {
        profile: false,
        privacy: false,
        notifications: false,
      },
      
      // Error states
      errors: {
        profile: null,
        privacy: null,
        notifications: null,
      },
      
      // Last sync timestamps
      lastSynced: {
        profile: null,
        privacy: null,
        notifications: null,
      },
      
      // Conflict tracking
      conflicts: {
        profile: null,
        privacy: null,
        notifications: null,
      },
      
      // Dirty state (has unsaved changes)
      isDirty: {
        profile: false,
        privacy: false,
        notifications: false,
      },
      
      // Actions: Profile
      setProfile: (profileData, options = {}) => {
        const { optimistic = true, skipDirty = false } = options;
        
        set((state) => ({
          profile: optimistic ? { ...state.profile, ...profileData } : profileData,
          isDirty: skipDirty ? state.isDirty : { ...state.isDirty, profile: true },
          errors: { ...state.errors, profile: null },
        }));
      },
      
      updateProfile: async (profileData, apiCall) => {
        const state = get();
        
        // Optimistic update
        set({
          isSaving: { ...state.isSaving, profile: true },
          errors: { ...state.errors, profile: null },
        });
        
        // Apply optimistic update
        state.setProfile(profileData, { optimistic: true });
        
        try {
          // Call API
          const result = await apiCall(profileData);
          
          // Update with server response
          set({
            profile: result,
            isSaving: { ...state.isSaving, profile: false },
            isDirty: { ...state.isDirty, profile: false },
            lastSynced: { ...state.lastSynced, profile: new Date().toISOString() },
            errors: { ...state.errors, profile: null },
          });
          
          return { success: true, data: result };
        } catch (error) {
          // Revert on error
          const currentState = get();
          set({
            profile: state.profile,
            isSaving: { ...currentState.isSaving, profile: false },
            errors: { ...currentState.errors, profile: error.message || 'Failed to update profile' },
          });
          
          return { success: false, error: error.message };
        }
      },
      
      // Actions: Privacy
      setPrivacy: (privacyData, options = {}) => {
        const { optimistic = true, skipDirty = false } = options;
        
        set((state) => ({
          privacy: optimistic ? { ...state.privacy, ...privacyData } : privacyData,
          isDirty: skipDirty ? state.isDirty : { ...state.isDirty, privacy: true },
          errors: { ...state.errors, privacy: null },
        }));
      },
      
      updatePrivacy: async (privacyData, apiCall) => {
        const state = get();
        
        // Optimistic update
        set({
          isSaving: { ...state.isSaving, privacy: true },
          errors: { ...state.errors, privacy: null },
        });
        
        // Apply optimistic update
        state.setPrivacy(privacyData, { optimistic: true });
        
        try {
          // Call API
          const result = await apiCall(privacyData);
          
          // Update with server response
          set({
            privacy: result,
            isSaving: { ...state.isSaving, privacy: false },
            isDirty: { ...state.isDirty, privacy: false },
            lastSynced: { ...state.lastSynced, privacy: new Date().toISOString() },
            errors: { ...state.errors, privacy: null },
          });
          
          return { success: true, data: result };
        } catch (error) {
          // Revert on error
          const currentState = get();
          set({
            privacy: state.privacy,
            isSaving: { ...currentState.isSaving, privacy: false },
            errors: { ...currentState.errors, privacy: error.message || 'Failed to update privacy settings' },
          });
          
          return { success: false, error: error.message };
        }
      },
      
      // Actions: Notifications
      setNotifications: (notificationData, options = {}) => {
        const { optimistic = true, skipDirty = false } = options;
        
        set((state) => ({
          notifications: optimistic ? { ...state.notifications, ...notificationData } : notificationData,
          isDirty: skipDirty ? state.isDirty : { ...state.isDirty, notifications: true },
          errors: { ...state.errors, notifications: null },
        }));
      },
      
      updateNotifications: async (notificationData, apiCall) => {
        const state = get();
        
        // Optimistic update
        set({
          isSaving: { ...state.isSaving, notifications: true },
          errors: { ...state.errors, notifications: null },
        });
        
        // Apply optimistic update
        state.setNotifications(notificationData, { optimistic: true });
        
        try {
          // Call API
          const result = await apiCall(notificationData);
          
          // Update with server response
          set({
            notifications: result,
            isSaving: { ...state.isSaving, notifications: false },
            isDirty: { ...state.isDirty, notifications: false },
            lastSynced: { ...state.lastSynced, notifications: new Date().toISOString() },
            errors: { ...state.errors, notifications: null },
          });
          
          return { success: true, data: result };
        } catch (error) {
          // Revert on error
          const currentState = get();
          set({
            notifications: state.notifications,
            isSaving: { ...currentState.isSaving, notifications: false },
            errors: { ...currentState.errors, notifications: error.message || 'Failed to update notification preferences' },
          });
          
          return { success: false, error: error.message };
        }
      },
      
      // Sync actions (load from API)
      syncProfile: async (apiCall) => {
        const state = get();
        
        set({
          isLoading: { ...state.isLoading, profile: true },
          errors: { ...state.errors, profile: null },
        });
        
        try {
          const data = await apiCall();
          
          set({
            profile: data,
            isLoading: { ...state.isLoading, profile: false },
            isDirty: { ...state.isDirty, profile: false },
            lastSynced: { ...state.lastSynced, profile: new Date().toISOString() },
            errors: { ...state.errors, profile: null },
          });
          
          return { success: true, data };
        } catch (error) {
          set({
            isLoading: { ...state.isLoading, profile: false },
            errors: { ...state.errors, profile: error.message || 'Failed to sync profile' },
          });
          
          return { success: false, error: error.message };
        }
      },
      
      syncPrivacy: async (apiCall) => {
        const state = get();
        
        set({
          isLoading: { ...state.isLoading, privacy: true },
          errors: { ...state.errors, privacy: null },
        });
        
        try {
          const data = await apiCall();
          
          set({
            privacy: data,
            isLoading: { ...state.isLoading, privacy: false },
            isDirty: { ...state.isDirty, privacy: false },
            lastSynced: { ...state.lastSynced, privacy: new Date().toISOString() },
            errors: { ...state.errors, privacy: null },
          });
          
          return { success: true, data };
        } catch (error) {
          set({
            isLoading: { ...state.isLoading, privacy: false },
            errors: { ...state.errors, privacy: error.message || 'Failed to sync privacy settings' },
          });
          
          return { success: false, error: error.message };
        }
      },
      
      syncNotifications: async (apiCall) => {
        const state = get();
        
        set({
          isLoading: { ...state.isLoading, notifications: true },
          errors: { ...state.errors, notifications: null },
        });
        
        try {
          const data = await apiCall();
          
          set({
            notifications: data,
            isLoading: { ...state.isLoading, notifications: false },
            isDirty: { ...state.isDirty, notifications: false },
            lastSynced: { ...state.lastSynced, notifications: new Date().toISOString() },
            errors: { ...state.errors, notifications: null },
          });
          
          return { success: true, data };
        } catch (error) {
          set({
            isLoading: { ...state.isLoading, notifications: false },
            errors: { ...state.errors, notifications: error.message || 'Failed to sync notification preferences' },
          });
          
          return { success: false, error: error.message };
        }
      },
      
      // Conflict resolution
      resolveConflict: (type, resolution) => {
        const state = get();
        const conflict = state.conflicts[type];
        
        if (!conflict) return;
        
        if (resolution === 'local') {
          // Keep local changes, overwrite remote
          set({
            [type]: conflict.local,
            conflicts: { ...state.conflicts, [type]: null },
            isDirty: { ...state.isDirty, [type]: true },
          });
        } else if (resolution === 'remote') {
          // Use remote changes, discard local
          set({
            [type]: conflict.remote,
            conflicts: { ...state.conflicts, [type]: null },
            isDirty: { ...state.isDirty, [type]: false },
          });
        } else if (resolution === 'merge') {
          // Merge both (prefer remote for conflicts)
          set({
            [type]: { ...conflict.local, ...conflict.remote },
            conflicts: { ...state.conflicts, [type]: null },
            isDirty: { ...state.isDirty, [type]: true },
          });
        }
      },
      
      // Reset dirty state
      clearDirty: (type) => {
        set((state) => ({
          isDirty: { ...state.isDirty, [type]: false },
        }));
      },
      
      // Reset all state
      reset: () => {
        set({
          profile: defaultProfile,
          privacy: defaultPrivacy,
          notifications: defaultNotifications,
          isLoading: {
            profile: false,
            privacy: false,
            notifications: false,
          },
          isSaving: {
            profile: false,
            privacy: false,
            notifications: false,
          },
          errors: {
            profile: null,
            privacy: null,
            notifications: null,
          },
          lastSynced: {
            profile: null,
            privacy: null,
            notifications: null,
          },
          conflicts: {
            profile: null,
            privacy: null,
            notifications: null,
          },
          isDirty: {
            profile: false,
            privacy: false,
            notifications: false,
          },
        });
      },
    }),
    {
      name: 'vybe-settings-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist critical settings, exclude loading/saving states
      partialize: (state) => ({
        profile: state.profile,
        privacy: state.privacy,
        notifications: state.notifications,
        lastSynced: state.lastSynced,
      }),
      // Merge function for rehydration
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        // Reset loading/saving states on rehydration
        isLoading: currentState.isLoading,
        isSaving: currentState.isSaving,
        errors: currentState.errors,
      }),
    }
  )
);

export default useSettingsStore;

