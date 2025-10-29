'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Music2, Library, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { CONFIG } from '../config/constants.js';
import VybeLogo from './common/VybeLogo';
import { useState } from 'react';

const links = CONFIG.NAV_LINKS.map(link => {
  const iconMap = {
    'Home': Home,
    'Groups': Users,
    'Playlist': Music2,
    'Library': Library,
    'Profile': UserIcon,
    'Settings': Settings
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
      className={[
        'group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition nav-item backdrop-blur-sm border',
        active
          ? 'bg-white text-black shadow-md border-white/20'
          : 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border-white/15',
      ].join(' ')}
    >
      <Icon className={`h-4 w-4 ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        console.error('Sign out failed');
        setIsSigningOut(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-transparent bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-6xl items-center px-4">
        {/* left: brand (separate, no glass) */}
        <div className="shrink-0">
          <Link href="/" aria-label="Go to home" className="inline-block">
            <VybeLogo />
          </Link>
        </div>

        {/* spacer left of center */}
        <div className="flex-1" />

        {/* center: nav links */}
        <div className="flex items-center gap-2">
          {links.map(({ href, label, Icon }) => {
            const active =
              pathname === href || (href !== '/' && pathname && pathname.startsWith(href));
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

        {/* spacer right of center */}
        <div className="flex-1" />
        
        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition nav-item backdrop-blur-sm border border-white/10 text-white/70 hover:text-red-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className={`h-4 w-4 ${isSigningOut ? 'opacity-50' : 'opacity-70 group-hover:opacity-100'}`} />
          <span className="hidden sm:inline" suppressHydrationWarning>
            {isSigningOut ? 'Logging out...' : 'Log out'}
          </span>
        </button>
      </div>
    </nav>
  );
}
