'use client';

import { useEffect, useRef } from 'react';
import useSettingsStore from '@/store/settingsStore';
import { autoMigrateSettings, needsMigration } from '@/lib/migrations/settingsMigrations';

/**
 * Settings Migration Hook
 * 
 * Automatically runs settings migrations on user login/data load.
 * 
 * Usage:
 * ```jsx
 * function SettingsPage() {
 *   useSettingsMigration();
 *   // ... rest of component
 * }
 * ```
 */
export function useSettingsMigration() {
  const store = useSettingsStore();
  const hasRunMigrationRef = useRef(false);

  useEffect(() => {
    // Only run once per mount
    if (hasRunMigrationRef.current) return;

    // Check if migration is needed
    if (!needsMigration()) {
      hasRunMigrationRef.current = true;
      return;
    }

    // Run migration on store data
    const storeState = useSettingsStore.getState();
    
    const settings = {
      profile: storeState.profile,
      privacy: storeState.privacy,
      notifications: storeState.notifications,
    };

    // Migrate settings
    const migrated = autoMigrateSettings(settings);

    // Update store with migrated data
    if (migrated.profile && migrated.profile !== storeState.profile) {
      storeState.setProfile(migrated.profile, { optimistic: false, skipDirty: true });
    }

    if (migrated.privacy && migrated.privacy !== storeState.privacy) {
      storeState.setPrivacy(migrated.privacy, { optimistic: false, skipDirty: true });
    }

    if (migrated.notifications && migrated.notifications !== storeState.notifications) {
      storeState.setNotifications(migrated.notifications, { optimistic: false, skipDirty: true });
    }

    hasRunMigrationRef.current = true;
    
    console.log('[settings migration] Migration completed');
  }, []);

  return null;
}




