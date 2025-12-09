'use client';

import { Bell, Mail, Smartphone, Info, UserPlus, Users, MessageSquare, Music, Shield, Megaphone, Heart } from 'lucide-react';

/**
 * NotificationToggle - Reusable component for notification preferences
 * 
 * @param {string} id - Unique identifier for the notification
 * @param {string} label - Notification type label
 * @param {string} description - Explanation of what this notification is for
 * @param {boolean} inAppEnabled - Whether in-app notifications are enabled
 * @param {boolean} emailEnabled - Whether email notifications are enabled
 * @param {boolean} pushEnabled - Whether push notifications are enabled (optional)
 * @param {function} onInAppChange - Handler for in-app toggle change
 * @param {function} onEmailChange - Handler for email toggle change
 * @param {function} onPushChange - Handler for push toggle change (optional)
 * @param {boolean} disabled - Whether toggles are disabled (e.g., for required notifications)
 * @param {boolean} required - Whether this notification type is required and cannot be disabled
 * @param {string} iconType - Type of notification icon ('friend_request', 'follower', 'comment', 'playlist', 'security', 'announcement', 'song', 'default')
 */
export function NotificationToggle({
  id,
  label,
  description,
  inAppEnabled,
  emailEnabled,
  pushEnabled = false,
  onInAppChange,
  onEmailChange,
  onPushChange,
  disabled = false,
  required = false,
  iconType = 'default',
}) {
  // Icon mapping for notification types
  const iconMap = {
    friend_request: UserPlus,
    follower: Users,
    comment: MessageSquare,
    playlist: Music,
    security: Shield,
    announcement: Megaphone,
    song: Heart,
    default: Bell,
  };

  const NotificationIcon = iconMap[iconType] || iconMap.default;
  const handleInAppToggle = () => {
    if (!disabled && !required && onInAppChange) {
      onInAppChange(!inAppEnabled);
    }
  };

  const handleEmailToggle = () => {
    if (!disabled && onEmailChange) {
      onEmailChange(!emailEnabled);
    }
  };

  const handlePushToggle = () => {
    if (!disabled && onPushChange) {
      onPushChange(!pushEnabled);
    }
  };

  return (
    <div 
      className={[
        'p-4 rounded-lg border transition-all duration-200',
        required
          ? 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Notification Type Icon */}
          <div className={[
            'flex-shrink-0 rounded-lg p-2 transition-colors duration-200',
            required
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-[var(--accent)]/20 text-[var(--accent)]',
          ].join(' ')}>
            <NotificationIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 
                id={`${id}-label`}
                className={[
                  'text-sm font-medium',
                  required ? 'text-blue-300' : 'text-white',
                ].join(' ')}
              >
                {label}
              </h4>
              {required && (
                <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded animate-pulse">
                  Required
                </span>
              )}
            </div>
            {description && (
              <p 
                id={`${id}-description`}
                className="text-xs text-[var(--muted-foreground)] leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {/* In-App Notification Toggle */}
        <div className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-white/5 transition-colors duration-150">
          <label 
            htmlFor={`${id}-inapp`}
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <Bell className={[
              'h-4 w-4 transition-colors duration-200',
              inAppEnabled ? 'text-[var(--accent)]' : 'text-gray-500',
            ].join(' ')} aria-hidden="true" />
            <span className={[
              'text-sm transition-colors duration-200',
              inAppEnabled ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
            ].join(' ')}>In-App</span>
            <Info className="h-3 w-3 text-gray-500" aria-hidden="true" title="Notifications shown in the app" />
          </label>
          <button
            type="button"
            id={`${id}-inapp`}
            role="switch"
            aria-checked={inAppEnabled}
            aria-label={`${label} in-app notifications ${inAppEnabled ? 'enabled' : 'disabled'}`}
            onClick={handleInAppToggle}
            disabled={disabled || required}
            className={[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black',
              inAppEnabled ? 'bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30' : 'bg-gray-600',
              (disabled || required) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out',
                inAppEnabled ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Email Notification Toggle */}
        <div className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-white/5 transition-colors duration-150">
          <label 
            htmlFor={`${id}-email`}
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <Mail className={[
              'h-4 w-4 transition-colors duration-200',
              emailEnabled ? 'text-blue-400' : 'text-gray-500',
            ].join(' ')} aria-hidden="true" />
            <span className={[
              'text-sm transition-colors duration-200',
              emailEnabled ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
            ].join(' ')}>Email</span>
            <Info className="h-3 w-3 text-gray-500" aria-hidden="true" title="Email notifications sent to your registered email" />
          </label>
          <button
            type="button"
            id={`${id}-email`}
            role="switch"
            aria-checked={emailEnabled}
            aria-label={`${label} email notifications ${emailEnabled ? 'enabled' : 'disabled'}`}
            onClick={handleEmailToggle}
            disabled={disabled || required}
            className={[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black',
              emailEnabled ? 'bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30' : 'bg-gray-600',
              (disabled || required) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out',
                emailEnabled ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Push Notification Toggle (Optional) */}
        {onPushChange && (
          <div className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-white/5 transition-colors duration-150">
            <label 
              htmlFor={`${id}-push`}
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Smartphone className={[
                'h-4 w-4 transition-colors duration-200',
                pushEnabled ? 'text-green-400' : 'text-gray-500',
              ].join(' ')} aria-hidden="true" />
            <span className={[
              'text-sm transition-colors duration-200',
              pushEnabled ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
            ].join(' ')}>Push</span>
              <Info className="h-3 w-3 text-gray-500" aria-hidden="true" title="Push notifications on mobile devices" />
            </label>
            <button
              type="button"
              id={`${id}-push`}
              role="switch"
              aria-checked={pushEnabled}
              aria-label={`${label} push notifications ${pushEnabled ? 'enabled' : 'disabled'}`}
              onClick={handlePushToggle}
              disabled={disabled || required}
              className={[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black',
                pushEnabled ? 'bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30' : 'bg-gray-600',
                (disabled || required) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out',
                  pushEnabled ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

