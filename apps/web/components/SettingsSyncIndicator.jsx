'use client';

import { CheckCircle2, RefreshCw, AlertCircle, WifiOff, Wifi } from 'lucide-react';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { useState, useEffect } from 'react';

/**
 * Settings Sync Indicator
 * 
 * Visual feedback for settings sync status showing:
 * - Synced (green checkmark)
 * - Syncing (spinning icon)
 * - Error (warning icon)
 * - Offline (wifi off icon)
 * 
 * Includes tooltip explaining current state.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.showNotifications - Show toast notifications (default: true)
 * @param {string} options.conflictResolution - Conflict resolution strategy (default: 'remote')
 * @param {string} options.className - Additional CSS classes
 * @returns {JSX.Element} Sync indicator component
 */
export default function SettingsSyncIndicator({ 
  showNotifications = true,
  conflictResolution = 'remote',
  className = '',
}) {
  const sync = useSettingsSync({
    enabled: true,
    showNotifications,
    conflictResolution,
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Determine sync status
  const getSyncStatus = () => {
    if (!sync.isOnline) {
      return {
        icon: WifiOff,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/20',
        status: 'offline',
        label: 'Offline',
        tooltip: 'No internet connection. Changes will sync when you come back online.',
      };
    }

    if (sync.isSyncing) {
      return {
        icon: RefreshCw,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        status: 'syncing',
        label: 'Syncing...',
        tooltip: 'Syncing settings across devices...',
        animate: true,
      };
    }

    if (sync.queuedUpdatesCount > 0) {
      return {
        icon: AlertCircle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        status: 'queued',
        label: `${sync.queuedUpdatesCount} queued`,
        tooltip: `${sync.queuedUpdatesCount} update(s) queued. Will sync when online.`,
      };
    }

    if (sync.subscriptionsActive) {
      return {
        icon: CheckCircle2,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        status: 'synced',
        label: 'Synced',
        tooltip: 'Settings are synced in real-time across all your devices.',
      };
    }

    // Default: connecting
    return {
      icon: RefreshCw,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20',
      status: 'connecting',
      label: 'Connecting...',
      tooltip: 'Connecting to sync service...',
      animate: true,
    };
  };

  const status = getSyncStatus();
  const Icon = status.icon;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        className={[
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
          'hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black',
          status.color,
          status.bgColor,
          status.borderColor,
          'focus:ring-blue-500',
        ].join(' ')}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => {
          // Process queued updates on click (if offline and queued)
          if (!sync.isOnline && sync.queuedUpdatesCount > 0 && sync.processQueuedUpdates) {
            sync.processQueuedUpdates();
          }
        }}
        aria-label={status.label}
        aria-describedby="sync-tooltip"
      >
        <Icon
          className={[
            'h-4 w-4',
            status.animate ? 'animate-spin' : '',
          ].join(' ')}
        />
        <span className="hidden sm:inline">{status.label}</span>
        
        {/* Queued count badge */}
        {sync.queuedUpdatesCount > 0 && (
          <span className={[
            'ml-1 px-1.5 py-0.5 rounded text-xs font-medium',
            'bg-yellow-500/20 text-yellow-300',
          ].join(' ')}>
            {sync.queuedUpdatesCount}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          id="sync-tooltip"
          className={[
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-2 rounded-lg text-xs text-white',
            'bg-gray-900 border border-white/10 shadow-lg',
            'whitespace-nowrap z-50',
            'animate-in fade-in slide-in-from-bottom-2',
          ].join(' ')}
          role="tooltip"
        >
          {status.tooltip}
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 border-r border-b border-white/10 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}




