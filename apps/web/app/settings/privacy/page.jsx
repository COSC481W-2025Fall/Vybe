'use client';

import { Shield } from 'lucide-react';
import SettingsPageWrapper from '@/components/SettingsPageWrapper';

export default function PrivacySettingsPage() {
  return (
    <SettingsPageWrapper>
      {/* Section Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              Privacy
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Control who can see your activity and playlists
            </p>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-medium text-white mb-2">Privacy Controls</h3>
            <p className="text-gray-400 text-sm">
              This section is under development. You&apos;ll be able to control who can see 
              your profile, playlists, and listening activity here.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            <span>Coming soon...</span>
          </div>
        </div>
      </div>
    </SettingsPageWrapper>
  );
}

