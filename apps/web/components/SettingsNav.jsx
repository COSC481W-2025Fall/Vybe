'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

/**
 * SettingsNav - Reusable navigation component for settings sections
 * 
 * Features:
 * - Desktop and mobile responsive
 * - Keyboard navigation support (accessibility)
 * - Active section highlighting based on URL
 * - Smooth transitions and hover states
 * - Slide-out mobile menu with backdrop
 * 
 * @param {Array} sections - Array of section objects with {id, label, icon, description, path}
 * @param {string} variant - 'sidebar' (desktop) or 'mobile' (mobile menu)
 */
export default function SettingsNav({ 
  sections = [], 
  variant = 'sidebar' // 'sidebar' or 'mobile'
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const firstButtonRef = useRef(null);
  const buttonRefs = useRef({}); // Store refs for all buttons

  // Determine active section based on current path
  const activeSection = sections.find(s => pathname === s.path)?.id || sections[0]?.id;

  // Handle mobile menu toggle
  const handleToggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle keyboard navigation on Link
  const handleKeyDown = (event, sectionPath, index) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (index + 1) % sections.length;
        const nextSection = sections[nextIndex];
        buttonRefs.current[nextSection.id]?.querySelector('a')?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = (index - 1 + sections.length) % sections.length;
        const prevSection = sections[prevIndex];
        buttonRefs.current[prevSection.id]?.querySelector('a')?.focus();
        break;
      case 'Home':
        event.preventDefault();
        const firstSection = sections[0];
        buttonRefs.current[firstSection.id]?.querySelector('a')?.focus();
        break;
      case 'End':
        event.preventDefault();
        const lastSection = sections[sections.length - 1];
        buttonRefs.current[lastSection.id]?.querySelector('a')?.focus();
        break;
      default:
        break;
    }
  };

  // Close menu when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Focus management for accessibility
  useEffect(() => {
    if (!isMobileMenuOpen && variant === 'sidebar') {
      const activeButton = buttonRefs.current[activeSection]?.querySelector('a');
      if (activeButton) {
        activeButton.focus();
      }
    } else if (isMobileMenuOpen && variant === 'mobile') {
      if (firstButtonRef.current) {
        firstButtonRef.current.focus();
      }
    }
  }, [activeSection, isMobileMenuOpen, variant]);

  // Render navigation button
  const renderNavButton = (section, index) => {
    const Icon = section.icon;
    const isActive = pathname === section.path;
    
    // Use a callback ref to store this button in the refs object
    const buttonRef = (node) => {
      buttonRefs.current[section.id] = node;
      if (index === 0) firstButtonRef.current = node;
    };

    return (
      <div
        key={section.id}
        ref={buttonRef}
        onKeyDown={(e) => handleKeyDown(e, section.path, index)}
        className="focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent)]/50 focus-within:ring-offset-2 focus-within:ring-offset-[var(--background)] rounded-xl"
      >
        <Link
          href={section.path}
          onClick={() => {
            if (variant === 'mobile' || isMobileMenuOpen) {
              setIsMobileMenuOpen(false);
            }
          }}
          className={[
            'w-full flex items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-all block',
            'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2 focus:ring-offset-[var(--background)]',
            'touch-manipulation min-h-[48px]', // Better touch target for mobile
            isActive
              ? 'bg-gradient-to-r from-[var(--accent)]/20 to-blue-500/20 border border-[var(--accent)]/30 shadow-lg'
              : 'text-[var(--muted-foreground)] hover:bg-white/5 [data-theme="light"]:hover:bg-black/5 hover:text-[var(--foreground)] border border-transparent',
          ].join(' ')}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${section.label} settings`}
        >
          <Icon
            className={[
              'h-5 w-5 flex-shrink-0 mt-0.5 transition-colors',
              isActive ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]',
            ].join(' ')}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div
              className={[
                'text-sm font-medium transition-colors',
                isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
              ].join(' ')}
            >
              {section.label}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] opacity-70 mt-0.5 transition-colors">
              {section.description}
            </div>
          </div>
        </Link>
      </div>
    );
  };

  // Desktop Sidebar Variant
  if (variant === 'sidebar') {
    return (
      <aside className="hidden lg:block lg:w-64 flex-shrink-0">
        <nav className="sticky top-24 space-y-1" role="navigation" aria-label="Settings sections">
          {sections.map((section, index) => renderNavButton(section, index))}
        </nav>
      </aside>
    );
  }

  // Mobile Menu Variant with Hamburger Button
  if (variant === 'mobile') {
    return (
      <>
        {/* Hamburger Menu Button */}
        <button
          onClick={handleToggleMenu}
          className="lg:hidden rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] transition touch-manipulation"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-settings-menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>

        {/* Slide-out Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
          >
            {/* Menu Panel - Slides in from right */}
            <div 
              ref={menuRef}
              id="mobile-settings-menu"
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] glass-card border-r border-white/10 [data-theme='light']:border-black/10 overflow-y-auto"
            >
              <div className="p-5">
                {/* Menu Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 id="mobile-menu-title" className="text-lg font-semibold text-[var(--foreground)]">
                    Settings Menu
                  </h2>
                  <button
                    onClick={handleToggleMenu}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 touch-manipulation"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                
                {/* Navigation Items */}
                <nav className="space-y-2" role="navigation" aria-label="Settings sections">
                  {sections.map((section, index) => renderNavButton(section, index))}
                </nav>
              </div>
            </div>
            
            {/* Backdrop Overlay - clicking closes the menu */}
            <div
              className="absolute inset-0 -z-10"
              onClick={handleToggleMenu}
              aria-hidden="true"
            />
          </div>
        )}
      </>
    );
  }

  // Fallback - render nothing if variant is invalid
  return null;
}
