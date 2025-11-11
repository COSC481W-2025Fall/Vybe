'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { User, Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import SettingsNav from '@/components/SettingsNav';
import SettingsConflictDialog from '@/components/SettingsConflictDialog';
import useSettingsStore from '@/store/settingsStore';

// Context for managing unsaved changes across settings pages
const SettingsContext = createContext(null);

export function useSettingsContext() {
  return useContext(SettingsContext);
}

const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your display name, bio, and profile picture',
    path: '/settings/profile',
  },
  {
    id: 'account',
    label: 'Account',
    icon: SettingsIcon,
    description: 'Account settings and data management',
    path: '/settings/account',
  },
];

export default function SettingsPageWrapper({ children }) {
  const pathname = usePathname();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formSubmitHandler, setFormSubmitHandler] = useState(null);
  const [formResetHandler, setFormResetHandler] = useState(null);
  
  // Conflict dialog state
  const [conflictDialog, setConflictDialog] = useState({
    isOpen: false,
    type: null,
    localData: null,
    remoteData: null,
  });
  
  const conflicts = useSettingsStore((state) => state.conflicts);

  // Listen for conflict detection events
  useEffect(() => {
    const handleConflictDetected = (event) => {
      const { type, localData, remoteData } = event.detail;
      setConflictDialog({
        isOpen: true,
        type,
        localData,
        remoteData,
      });
    };

    window.addEventListener('settings-conflict-detected', handleConflictDetected);

    // Also check store for pending conflicts
    if (conflicts) {
      Object.entries(conflicts).forEach(([type, conflict]) => {
        if (conflict && conflict.needsResolution && !conflictDialog.isOpen) {
          setConflictDialog({
            isOpen: true,
            type,
            localData: conflict.local,
            remoteData: conflict.remote,
          });
        }
      });
    }

    return () => {
      window.removeEventListener('settings-conflict-detected', handleConflictDetected);
    };
  }, [conflicts, conflictDialog.isOpen]);

  // Handle conflict resolution
  const handleConflictResolve = (resolvedData, choice) => {
    const { type } = conflictDialog;
    
    // Update store with resolved data
    const store = useSettingsStore.getState();
    switch (type) {
      case 'profile':
        store.setProfile(resolvedData, { optimistic: false });
        break;
      // Privacy and notifications removed - no longer in settings
      default:
        console.warn(`Unknown conflict type: ${type}`);
        break;
    }

    // Clear conflict from store
    useSettingsStore.setState((state) => {
      const newConflicts = { ...state.conflicts };
      delete newConflicts[type];
      return { conflicts: newConflicts };
    });

    setConflictDialog({
      isOpen: false,
      type: null,
      localData: null,
      remoteData: null,
    });
  };

  const handleConflictClose = () => {
    setConflictDialog({
      isOpen: false,
      type: null,
      localData: null,
      remoteData: null,
    });
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    try {
      // If there's a custom form submit handler, call it
      if (formSubmitHandler) {
        await formSubmitHandler();
      } else {
        // Default save logic (for pages without forms)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setHasUnsavedChanges(false);
        console.log('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('Discard unsaved changes?');
      if (!confirmed) return;
    }
    // Reset form if handler is provided
    if (formResetHandler) {
      formResetHandler();
    }
    setHasUnsavedChanges(false);
  };

  return (
    <SettingsContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges, isSaving, handleSaveChanges, handleCancel, setFormSubmitHandler, setFormResetHandler }}>
      <div className="min-h-screen w-full">
      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Mobile Navigation - Hamburger Menu */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <SettingsNav
            sections={SETTINGS_SECTIONS}
            variant="mobile"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar Navigation - Desktop */}
          <SettingsNav
            sections={SETTINGS_SECTIONS}
            variant="sidebar"
          />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0" style={{ height: 'auto' }}>
            {/* Content Card */}
            <div className="glass-card rounded-2xl flex flex-col w-full" style={{ minHeight: 'fit-content' }}>
              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 sm:px-6 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">You have unsaved changes</span>
                  </div>
                </div>
              )}

              {/* Content area - contains all form content */}
              <div className="flex flex-col w-full">
                {children}
              </div>

              {/* Action Buttons - Always visible at bottom */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mt-6 pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/10 flex-shrink-0">
                <button
                  onClick={handleCancel}
                  disabled={!hasUnsavedChanges}
                  className={[
                    'px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'border border-white/20 text-gray-400 hover:bg-white/5 hover:text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'w-full sm:w-auto'
                  ].join(' ')}
                >
                  Cancel
                </button>

                <div className="flex flex-col items-stretch sm:items-end gap-1 w-full sm:w-auto">
                  <button
                    onClick={handleSaveChanges}
                    disabled={!hasUnsavedChanges || isSaving}
                    className={[
                      'px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'flex items-center justify-center gap-2 min-w-[140px] w-full sm:w-auto',
                      hasUnsavedChanges && !isSaving
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 cursor-pointer shadow-lg shadow-purple-500/20'
                        : 'bg-white/10 text-gray-300 border border-white/20 cursor-not-allowed',
                    ].join(' ')}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center sm:text-right hidden sm:block">
                    {hasUnsavedChanges ? 'Click to save your settings' : 'No changes to save'}
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Conflict Dialog */}
      <SettingsConflictDialog
        isOpen={conflictDialog.isOpen}
        onClose={handleConflictClose}
        type={conflictDialog.type}
        localData={conflictDialog.localData}
        remoteData={conflictDialog.remoteData}
        onResolve={handleConflictResolve}
      />
    </div>
    </SettingsContext.Provider>
  );
}

