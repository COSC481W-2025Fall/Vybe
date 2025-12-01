'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * NotificationBell - Bell icon component that shows notification count and dropdown
 * 
 * Features:
 * - Shows unread notification count badge
 * - Opens dropdown on click
 * - Positioned relative to button
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({});
  const buttonRef = useRef(null);
  const { data, isLoading } = useNotifications();

  const unreadCount = data?.unreadCount || 0;

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Position dropdown below the button, aligned to the right
      // On mobile, adjust to fit viewport
      const isMobile = viewportWidth < 768;
      
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: isMobile ? 16 : Math.max(16, viewportWidth - rect.right - 16), // 16px from right edge
      });
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        data-notification-bell
        onClick={handleToggle}
        className={[
          'relative h-9 w-9 rounded-full flex items-center justify-center',
          'bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25',
          "[data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:border-black/10",
          'text-[var(--foreground)] transition-all touch-manipulation',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
          isOpen && 'bg-white/15 border-white/25 [data-theme="light"]:bg-black/10',
        ].join(' ')}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        
        {/* Badge with unread count */}
        {unreadCount > 0 && (
          <span
            className={[
              'absolute -top-1 -right-1 flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1',
              'bg-red-500 text-white text-[10px] font-bold rounded-full',
              'border-2 border-[var(--background)]',
              'animate-pulse',
            ].join(' ')}
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-[999] lg:hidden"
            onClick={handleClose}
            aria-hidden="true"
          />
          <NotificationDropdown
            isOpen={isOpen}
            onClose={handleClose}
            position={dropdownPosition}
          />
        </>
      )}
    </div>
  );
}





