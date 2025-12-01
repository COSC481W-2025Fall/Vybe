'use client';

import { useEffect } from 'react';

/**
 * Script to prevent theme flash by applying theme class before React hydration
 * This runs inline in the HTML head to ensure theme is set immediately
 */
export function ThemeScript() {
  useEffect(() => {
    // This runs only on client after mount
    // The initial theme is set by the inline script in layout
  }, []);

  // Return null - this component's main purpose is the inline script in layout
  return null;
}

/**
 * Inline script to run before React hydration
 * This prevents flash of wrong theme on page load
 */
export const themeScriptContent = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      if (theme === 'system') {
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      // Default to system preference
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var defaultTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.classList.add(defaultTheme);
      document.documentElement.setAttribute('data-theme', defaultTheme);
    }
  } catch (e) {
    // Fallback to light if anything fails
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();

