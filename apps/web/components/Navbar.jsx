'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Library, User as UserIcon, LogOut, Settings, Menu, X, HelpCircle } from 'lucide-react';
import { CONFIG } from '../config/constants.js';
import VybeLogo from './common/VybeLogo';
import ThemeToggle from './ThemeToggle';
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

function NavPill({ href, label, Icon, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all nav-item backdrop-blur-sm border',
        active
          ? 'bg-[var(--foreground)] text-[var(--background)] shadow-md border-transparent'
          : 'text-[var(--foreground)] bg-white/10 hover:bg-white/15 border-white/15 hover:border-white/25 [data-theme="light"]:bg-black/5 [data-theme="light"]:hover:bg-black/10 [data-theme="light"]:border-black/10 [data-theme="light"]:hover:border-black/20',
      ].join(' ')}
    >
      <Icon className={`h-4 w-4 ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
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

  // Hide Navbar on sign-in and landing pages
  const shouldHideNavbar = pathname === '/sign-in' || pathname === '/';

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

  if (shouldHideNavbar) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--glass-border)] [data-theme='light']:border-black/15 bg-[var(--glass-bg)] backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-12 max-w-6xl items-center px-4">
        {/* left: brand - clickable logo goes to dashboard */}
        <div className="shrink-0">
          <Link 
            href="/dashboard" 
            aria-label="Go to dashboard" 
            className="inline-block cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
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
        
        {/* Theme Toggle, Help, and Sign out button - desktop only */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/help"
            className="group relative flex items-center justify-center rounded-xl p-2 text-sm font-medium transition-all nav-item backdrop-blur-sm border text-[var(--foreground)] bg-white/10 hover:bg-white/15 border-white/15 hover:border-white/25 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:border-black/10 [data-theme='light']:hover:border-black/20"
            title="Help"
          >
            <HelpCircle className="h-4 w-4 opacity-80" />
            {/* Tooltip on hover */}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--background)] border border-[var(--glass-border)] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Help
            </span>
          </Link>
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="group items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all nav-item backdrop-blur-sm border text-[var(--foreground)] bg-white/10 hover:bg-white/15 border-white/15 hover:border-white/25 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:border-black/10 [data-theme='light']:hover:border-black/20 disabled:opacity-50 disabled:cursor-not-allowed flex"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className={`h-4 w-4 ${isSigningOut ? 'opacity-50' : 'opacity-80'}`} />
            <span suppressHydrationWarning>
              {isSigningOut ? 'Logging out...' : 'Log out'}
            </span>
          </button>
        </div>

        {/* Mobile: Theme Toggle and hamburger menu button - right aligned */}
        <div className="md:hidden ml-auto flex items-center gap-3">
          {/* Theme control */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
          {/* Divider */}
          <div className="w-px h-6 bg-[var(--glass-border)]" />
          {/* Hamburger menu */}
          <button
            ref={hamburgerButtonRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--foreground)] bg-white/10 hover:bg-white/15 border border-white/15 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:border-black/10 transition-colors"
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
      </div>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden absolute top-full left-0 right-0 bg-[var(--dropdown-bg)] backdrop-blur-xl border-b border-[var(--glass-border)] shadow-lg transition-all duration-200 ease-in-out"
          data-testid="mobile-nav"
        >
          <div className="max-w-6xl mx-auto px-4 py-4 max-h-[calc(100vh-3rem)] overflow-y-auto modal-scroll">
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden">
              {links.map(({ href, label, Icon }) => {
                const active =
                  pathname === href || (href !== '/dashboard' && pathname?.startsWith(href)) || (href === '/dashboard' && pathname === '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={[
                      'flex items-center gap-3 px-4 py-3.5 text-base font-medium transition-colors border-b border-[var(--glass-border)] last:border-b-0',
                      active
                        ? 'bg-[var(--foreground)] text-[var(--background)]'
                        : 'text-[var(--foreground)] hover:bg-white/10 [data-theme="light"]:hover:bg-black/5',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'opacity-100' : 'opacity-80'}`} />
                    <span>{label}</span>
                  </Link>
                );
              })}
              <Link
                href="/help"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 text-base font-medium transition-colors text-[var(--foreground)] hover:bg-white/10 [data-theme='light']:hover:bg-black/5 border-t border-[var(--glass-border)]"
              >
                <HelpCircle className="h-5 w-5 opacity-80" />
                <span>Help</span>
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium transition-colors text-[var(--foreground)] hover:bg-white/10 [data-theme='light']:hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed border-t border-[var(--glass-border)]"
                aria-label="Sign out"
              >
                <LogOut className={`h-5 w-5 opacity-80`} />
                <span suppressHydrationWarning>
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
