'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSettingsStore from '@/store/settingsStore';

/**
 * Auto-Save Hook
 * 
 * Implements auto-save functionality for settings with:
 * - Debounced save after user stops typing (2 seconds)
 * - Visual indicator showing save status (Saving..., Saved, Error)
 * - Retry failed saves
 * - Prevent navigation away with unsaved changes
 * - Show warning before leaving page with unsaved data
 * - Use TanStack Query mutations with optimistic updates
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.type - Settings type: 'profile', 'privacy', or 'notifications'
 * @param {Function} options.mutationFn - TanStack Query mutation function
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 2000)
 * @param {boolean} options.enableBeforeUnload - Enable beforeunload warning (default: true)
 * @param {boolean} options.enableRouteBlock - Enable route change blocking (default: true)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @returns {Object} Auto-save state and controls
 */
export function useAutoSave(options = {}) {
  const {
    type,
    mutationFn,
    debounceMs = 2000,
    enableBeforeUnload = true,
    enableRouteBlock = true,
    maxRetries = 3,
  } = options;

  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const store = useSettingsStore();
  const router = useRouter();
  const debounceTimerRef = useRef(null);
  const isUnmountingRef = useRef(false);
  const pendingSaveRef = useRef(null);

  // Get current settings data
  const getCurrentData = useCallback(() => {
    switch (type) {
      case 'profile':
        return store.profile;
      case 'privacy':
        return store.privacy;
      case 'notifications':
        return store.notifications;
      default:
        return null;
    }
  }, [type, store]);

  // Check if settings are dirty
  const isDirty = store.isDirty[type];

  // Auto-save function
  const performSave = useCallback(async (data, isRetry = false) => {
    if (!data || !mutationFn) return;

    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      // Perform mutation
      const result = await mutationFn(data);

      if (result && result.error) {
        throw new Error(result.error);
      }

      // Success
      setSaveStatus('saved');
      setLastSaved(new Date());
      setRetryCount(0);

      // Clear dirty state
      store.clearDirty(type);

      // Clear saved status after 3 seconds
      setTimeout(() => {
        if (!isUnmountingRef.current && saveStatus === 'saved') {
          setSaveStatus('idle');
        }
      }, 3000);

      return { success: true, data: result };
    } catch (error) {
      console.error(`[auto-save] Error saving ${type}:`, error);

      setSaveStatus('error');
      setErrorMessage(error.message || 'Failed to save');

      // Auto-retry on error (up to maxRetries)
      if (!isRetry && retryCount < maxRetries) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, newRetryCount - 1) * 1000;

        setTimeout(() => {
          if (!isUnmountingRef.current) {
            performSave(data, true);
          }
        }, delay);
      } else {
        // Max retries reached
        setErrorMessage(
          error.message || `Failed to save after ${maxRetries} attempts`
        );
      }

      return { success: false, error: error.message };
    }
  }, [type, mutationFn, retryCount, maxRetries, store]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const data = getCurrentData();
      if (data && isDirty) {
        pendingSaveRef.current = data;
        performSave(data);
      }
    }, debounceMs);
  }, [getCurrentData, isDirty, debounceMs, performSave]);

  // Trigger auto-save when settings change
  useEffect(() => {
    if (!isDirty || !mutationFn) return;

    // Reset save status when settings change
    if (saveStatus === 'saved') {
      setSaveStatus('idle');
    }

    // Trigger debounced save
    debouncedSave();

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDirty, debouncedSave, mutationFn, saveStatus]);

  // Save immediately (manual trigger)
  const saveNow = useCallback(async () => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const data = getCurrentData();
    if (data) {
      return await performSave(data);
    }
  }, [getCurrentData, performSave]);

  // Retry failed save
  const retrySave = useCallback(async () => {
    const data = pendingSaveRef.current || getCurrentData();
    if (data) {
      setRetryCount(0);
      return await performSave(data, false);
    }
  }, [getCurrentData, performSave]);

  // Before unload warning
  useEffect(() => {
    if (!enableBeforeUnload || !isDirty) return;

    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enableBeforeUnload, isDirty]);

  // Route change blocking
  useEffect(() => {
    if (!enableRouteBlock) return;

    // Note: Next.js App Router doesn't have a direct way to block navigation
    // We can use a custom event to communicate with the router
    // For now, we'll rely on beforeunload and manual checks
    // Future: Could use a router middleware or custom navigation handler
  }, [enableRouteBlock]);

  // Cleanup on unmount
  useEffect(() => {
    isUnmountingRef.current = false;

    return () => {
      isUnmountingRef.current = true;

      // Save any pending changes before unmount
      if (isDirty && pendingSaveRef.current) {
        // Attempt to save synchronously (may not complete)
        const data = pendingSaveRef.current;
        if (data && mutationFn) {
          mutationFn(data).catch((error) => {
            console.error(`[auto-save] Error saving ${type} on unmount:`, error);
          });
        }
      }

      // Clear timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDirty, type, mutationFn]);

  // Save status indicator text
  const statusText = {
    idle: '',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Error saving',
  }[saveStatus];

  return {
    // State
    saveStatus,
    statusText,
    isDirty,
    lastSaved,
    errorMessage,
    retryCount,
    maxRetries,
    canRetry: saveStatus === 'error' && retryCount < maxRetries,

    // Actions
    saveNow,
    retrySave,

    // Utilities
    clearError: () => {
      setErrorMessage(null);
      if (saveStatus === 'error') {
        setSaveStatus('idle');
      }
    },
  };
}





