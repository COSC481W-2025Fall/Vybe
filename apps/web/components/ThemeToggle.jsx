'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCallback } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Click toggles between light and dark. If currently 'system', go to light.
  const handleClick = useCallback(() => {
    if (!mounted) return;
    if (theme === 'system' || theme === 'dark') {
      // switch to light
      toggleTheme(); // toggle uses effectiveTheme; if system->dark effective, will go to light
    } else if (theme === 'light') {
      toggleTheme();
    }
  }, [mounted, theme, toggleTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <button
        className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition text-muted-foreground hover:text-foreground hover:bg-accent/50"
        aria-label="Theme toggle"
        disabled
      >
        <Monitor className="h-4 w-4 opacity-70" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition text-muted-foreground hover:text-foreground hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-background"
      aria-label="Toggle theme"
      title={theme === 'light' ? 'Switch to Dark' : theme === 'dark' ? 'Switch to Light' : 'Use Light'}
    >
      {theme === 'light' && <Sun className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
      {theme === 'dark' && <Moon className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
      {theme === 'system' && <Monitor className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
    </button>
  );
}

