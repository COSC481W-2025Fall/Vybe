'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, Bell, Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import SettingsNav from '@/components/SettingsNav';

const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your display name, bio, and profile picture',
    path: '/settings/profile',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Shield,
    description: 'Control who can see your activity and playlists',
    path: '/settings/privacy',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure your notification preferences',
    path: '/settings/notifications',
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

  // Handle save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    try {
      // TODO: Implement actual save logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      console.log('Settings saved successfully');
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
    setHasUnsavedChanges(false);
    // TODO: Reset form to original values
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f]">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
            <Link 
              href="/home" 
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Home</span>
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-white font-medium">Settings</span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>
            {/* Mobile menu button */}
            <SettingsNav
              sections={SETTINGS_SECTIONS}
              variant="mobile"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Desktop */}
          <SettingsNav
            sections={SETTINGS_SECTIONS}
            variant="sidebar"
          />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Content Card */}
            <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>You have unsaved changes</span>
                  </div>
                </div>
              )}

              {children}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4 mt-6 pt-6 px-6 pb-6 border-t border-white/10">
                <button
                  onClick={handleCancel}
                  disabled={!hasUnsavedChanges}
                  className={[
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    'border border-white/20 text-gray-400 hover:bg-white/5 hover:text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  ].join(' ')}
                >
                  Cancel
                </button>

                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleSaveChanges}
                    disabled={!hasUnsavedChanges || isSaving}
                    className={[
                      'px-6 py-2 rounded-lg text-sm font-medium transition-all',
                      'bg-gradient-to-r from-purple-500 to-blue-500 text-white',
                      'hover:from-purple-600 hover:to-blue-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'flex items-center gap-2'
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
                  <p className="text-xs text-gray-500">
                    Click to save your settings
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

