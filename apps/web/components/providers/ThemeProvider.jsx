'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  customColors: {
    background: '#0a0a0a',
    foreground: '#ededed',
    accent: '#8b5cf6',
  },
  setCustomColors: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system');
  const [customColors, setCustomColorsState] = useState({
    background: '#0a0a0a',
    foreground: '#ededed',
    accent: '#8b5cf6',
  });
  const [mounted, setMounted] = useState(false);

  // Initialize from cookies and localStorage
  useEffect(() => {
    const cookies = document.cookie.split('; ').reduce((acc, current) => {
      const [name, value] = current.split('=');
      acc[name] = value;
      return acc;
    }, {});

    if (cookies.theme) {
      setThemeState(cookies.theme);
    }

    const savedCustomColors = localStorage.getItem('customTheme');
    if (savedCustomColors) {
      try {
        setCustomColorsState(JSON.parse(savedCustomColors));
      } catch (e) {
        console.error('Failed to parse custom theme', e);
      }
    }
    setMounted(true);
  }, []);

  // Save theme to cookie
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`; // 1 year
  };

  // Save custom colors to localStorage
  const setCustomColors = (newColors) => {
    const updated = { ...customColors, ...newColors };
    setCustomColorsState(updated);
    localStorage.setItem('customTheme', JSON.stringify(updated));
  };

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const applyCustomColors = () => {
      root.style.setProperty('--background', customColors.background);
      root.style.setProperty('--foreground', customColors.foreground);
      root.style.setProperty('--accent', customColors.accent);
      // Also update tailwind variables if needed, but they map to css vars
    };

    const removeCustomColors = () => {
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--accent');
    };

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.setAttribute('data-theme', systemTheme);
      removeCustomColors();
    } else if (theme === 'custom') {
      root.setAttribute('data-theme', 'custom');
      applyCustomColors();
    } else {
      root.setAttribute('data-theme', theme);
      removeCustomColors();
    }

    // Listen for system changes if in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, customColors, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
