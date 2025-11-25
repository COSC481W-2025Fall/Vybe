'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Library, User as UserIcon, LogOut, Settings, Menu, X } from 'lucide-react';
import { CONFIG } from '../config/constants.js';
import VybeLogo from './common/VybeLogo';
import { useState, useEffect, useRef } from 'react';

const links = CONFIG.NAV_LINKS.map(link => {
  const iconMap = {
    'Home': Home,
    'Groups': Users,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const hamburgerButtonRef = useRef(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        hamburgerButtonRef.current &&
        !hamburgerButtonRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    // Scroll to top when route changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

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
          <Link href="/dashboard" aria-label="Go to home" className="inline-block" onClick={() => setIsMobileMenuOpen(false)}>
            <VybeLogo />
          </Link>
        </div>

        {/* spacer left of center */}
        <div className="flex-1 hidden md:block" />

        {/* center: nav links - desktop only */}
        <div className="hidden md:flex items-center gap-2" data-testid="desktop-nav">
          {links.map(({ href, label, Icon }) => {
            const active =
              pathname === href || (href !== '/dashboard' && pathname?.startsWith(href)) || (href === '/dashboard' && pathname === '/');
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
        <div className="flex-1 hidden md:block" />
        
        {/* Sign out button - desktop only */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="hidden md:flex group items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition nav-item backdrop-blur-sm border border-white/10 text-white/70 hover:text-red-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className={`h-4 w-4 ${isSigningOut ? 'opacity-50' : 'opacity-70 group-hover:opacity-100'}`} />
          <span suppressHydrationWarning>
            {isSigningOut ? 'Logging out...' : 'Log out'}
          </span>
        </button>

        {/* Mobile hamburger menu button */}
        <button
          ref={hamburgerButtonRef}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden ml-auto flex items-center justify-center w-10 h-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/10 active:text-white transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-gray-700 shadow-lg transition-all duration-200 ease-in-out"
          data-testid="mobile-nav"
        >
          <div className="max-w-6xl mx-auto px-4 py-4 max-h-[calc(100vh-3rem)] overflow-y-auto modal-scroll">
            <div className="bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
              {links.map(({ href, label, Icon }) => {
                const active =
                  pathname === href || (href !== '/dashboard' && pathname?.startsWith(href)) || (href === '/dashboard' && pathname === '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={[
                      'flex items-center gap-3 px-4 py-3 text-base transition-colors border-b border-gray-700 last:border-b-0',
                      active
                        ? 'bg-gray-700 text-white'
                        : 'text-white hover:bg-gray-700/50',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'opacity-100' : 'opacity-70'}`} />
                    <span className="font-medium">{label}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-base transition-colors text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-700"
                aria-label="Sign out"
              >
                <LogOut className={`h-5 w-5 opacity-70`} />
                <span className="font-medium" suppressHydrationWarning>
                  {isSigningOut ? 'Logging out...' : 'Log out'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
