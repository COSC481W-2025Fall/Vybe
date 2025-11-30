'use client';

import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Save Status Indicator
 * 
 * Visual indicator showing save status for settings forms.
 * Displays: Saving..., Saved, Error states with icons.
 */
export default function SaveStatusIndicator({ status, errorMessage, className = '' }) {
  const statusConfig = {
    idle: {
      icon: null,
      text: '',
      color: '',
    },
    saving: {
      icon: Loader2,
      text: 'Saving...',
      color: 'text-blue-400',
    },
    saved: {
      icon: CheckCircle2,
      text: 'Saved',
      color: 'text-green-400',
    },
    error: {
      icon: XCircle,
      text: errorMessage || 'Error saving',
      color: 'text-red-400',
    },
  };

  const config = statusConfig[status] || statusConfig.idle;

  if (status === 'idle') {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 text-sm ${config.color} ${className}`}>
      {Icon && (
        <Icon
          className={`h-4 w-4 ${status === 'saving' ? 'animate-spin' : ''}`}
        />
      )}
      <span>{config.text}</span>
    </div>
  );
}




