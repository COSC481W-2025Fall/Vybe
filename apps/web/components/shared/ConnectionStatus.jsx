'use client';

import { useRealtime } from '@/lib/realtime/RealtimeProvider';
import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';

/**
 * Connection status indicator showing real-time connection state
 */
export function ConnectionStatus({ showLabel = false, className = '' }) {
  const { isConnected, connectionState } = useRealtime();

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bg: 'bg-green-400/10',
          label: 'Live',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10',
          label: 'Connecting',
          pulse: true,
          spin: true,
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-orange-400',
          bg: 'bg-orange-400/10',
          label: 'Reconnecting',
          pulse: true,
          spin: true,
        };
      case 'fallback_polling':
        return {
          icon: Cloud,
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
          label: 'Polling',
          pulse: false,
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          label: 'Offline',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${className}`}
      title={`Connection: ${config.label}`}
    >
      <Icon 
        className={`h-3 w-3 ${config.color} ${config.spin ? 'animate-spin' : ''}`} 
      />
      {config.pulse && (
        <span className={`absolute h-3 w-3 ${config.color} animate-ping opacity-75 rounded-full`} />
      )}
      {showLabel && (
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * Minimal connection dot indicator
 */
export function ConnectionDot({ className = '' }) {
  const { isConnected, connectionState } = useRealtime();

  const getColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-400';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-400 animate-pulse';
      case 'fallback_polling':
        return 'bg-blue-400';
      default:
        return 'bg-red-400';
    }
  };

  return (
    <span 
      className={`inline-block h-2 w-2 rounded-full ${getColor()} ${className}`}
      title={connectionState === 'connected' ? 'Live updates active' : `Status: ${connectionState}`}
    />
  );
}

