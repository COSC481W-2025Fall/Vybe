'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Music2, Library, User as UserIcon, LogOut } from 'lucide-react';
import { CONFIG } from '../config/constants.js';
import { useState } from 'react';

/**
 * Navigation component with sign-out functionality
 * Enhanced with better accessibility and user experience
 */

const links = CONFIG.NAV_LINKS.map(link => {
  const iconMap = {
    'Home': Home,
    'Groups': Users,
    'Playlist': Music2,
    'Library': Library,
    'Profile': UserIcon
  };
  return {
    ...link,
    Icon: iconMap[link.label] || UserIcon
  };
});

// eslint-disable-next-line react/prop-types
function NavPill({ href, label, Icon, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={`Navigate to ${label}`}
      className={[
        'group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-all duration-200',
        active
          ? 'bg-white text-black shadow-sm ring-1 ring-black/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105',
      ].join(' ')}
    >
      <Icon 
        className={`h-4 w-4 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} 
        aria-hidden="true"
      />
      <span className="hidden sm:inline font-medium">{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  /**
   * Handles user sign out with improved error handling and user feedback
   */
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const response = await fetch('/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // The server will handle the redirect, but we can also do it client-side as backup
        router.push('/sign-in');
        router.refresh();
        // Reset loading state after successful redirect
        setIsSigningOut(false);
      } else {
        console.error('Sign out failed with status:', response.status);
        setIsSigningOut(false);
        // Could add toast notification here for better UX
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
      // Could add toast notification here for better UX
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-6 px-4">
        {/* brand */}
        <Link href="/" className="text-xl font-extrabold">
          <span className="text-yellow-400">Vybe</span>
        </Link>

        {/* links */}
        <div className="flex items-center gap-2">
          {links.map(({ href, label, Icon }) => {
            const active =
              pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <NavPill
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                active={active}
              />
            );
          })}
        </div>

        {/* spacer for right-aligned actions */}
        <div className="ml-auto" />
        
        {/* Sign out button with enhanced styling and accessibility */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-all duration-200 text-muted-foreground hover:text-red-500 hover:bg-red-50/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          aria-label={isSigningOut ? 'Signing out...' : 'Sign out of your account'}
          title={isSigningOut ? 'Please wait...' : 'Click to sign out'}
        >
          <LogOut 
            className={`h-4 w-4 transition-all duration-200 ${isSigningOut ? 'opacity-50 animate-pulse' : 'opacity-70 group-hover:opacity-100'}`} 
            aria-hidden="true"
          />
          <span className="hidden sm:inline font-medium">
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </span>
        </button>
      </div>
    </nav>
  );
}
