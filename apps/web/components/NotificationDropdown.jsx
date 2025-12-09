'use client';

import { useRef, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';

/**
 * NotificationDropdown - Dropdown panel that displays notifications
 * 
 * @param {boolean} isOpen - Whether the dropdown is open
 * @param {function} onClose - Function to call when closing the dropdown
 * @param {object} position - Position object with { top, left, right } for dropdown placement
 */
export default function NotificationDropdown({ isOpen, onClose, position = {} }) {
  const dropdownRef = useRef(null);
  const { data, isLoading, error } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if click was not on the bell icon itself (handled by parent)
        const bellButton = event.target.closest('[data-notification-bell]');
        if (!bellButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when dropdown is open (optional)
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Format timestamp to relative time
  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  if (!isOpen) return null;

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Calculate dropdown position
  const dropdownStyle = {
    position: 'fixed',
    ...(position.top && { top: `${position.top}px` }),
    ...(position.right !== undefined && { right: `${position.right}px` }),
    ...(position.left !== undefined && { left: `${position.left}px` }),
    zIndex: 1000,
  };

  return (
    <div
      ref={dropdownRef}
      className="w-80 max-w-[calc(100vw-2rem)] bg-[var(--dropdown-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl"
      style={dropdownStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--accent)]/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)] rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-white/10 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] transition-colors touch-manipulation"
              aria-label="Mark all as read"
              title="Mark all as read"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-white/10 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] transition-colors touch-manipulation"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto modal-scroll">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-400">Failed to load notifications</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--muted-foreground)]">No notifications</p>
            <p className="text-xs text-[var(--muted-foreground)] opacity-70 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--glass-border)]">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={[
                  'px-4 py-3 hover:bg-white/5 [data-theme="light"]:hover:bg-black/5 transition-colors cursor-pointer',
                  !notification.read && 'bg-[var(--accent)]/5',
                ].join(' ')}
                onClick={() => {
                  // TODO: Handle notification click (navigate to relevant page)
                  console.log('Notification clicked:', notification);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] opacity-70 mt-2">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)] flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer (optional - could add "View all" link) */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--glass-border)] bg-white/5 [data-theme='light']:bg-black/5">
          <button
            className="w-full text-xs text-center text-[var(--accent)] hover:text-[var(--accent)] transition-colors py-1"
            onClick={() => {
              // TODO: Navigate to full notifications page if it exists
              console.log('View all notifications');
              onClose();
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}





