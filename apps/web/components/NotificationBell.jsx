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
          'relative rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white',
          'transition-all touch-manipulation',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-black',
          isOpen && 'bg-white/10 text-white',
        ].join(' ')}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        
        {/* Badge with unread count */}
        {unreadCount > 0 && (
          <span
            className={[
              'absolute -top-1 -right-1 flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1',
              'bg-red-500 text-white text-[10px] font-bold rounded-full',
              'border-2 border-[#0f0f0f]',
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



