'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children, initialTheme = 'system' }) {
  const [theme, setTheme] = useState(initialTheme);
  const [mounted, setMounted] = useState(false);

  // Get the effective theme (resolves 'system' to actual light/dark)
  const getEffectiveTheme = useCallback(() => {
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return theme;
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const effectiveTheme = getEffectiveTheme();
    const root = document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(effectiveTheme);
    
    // Update data attribute for CSS targeting
    root.setAttribute('data-theme', effectiveTheme);
    
    // Set data-theme attribute for potential use in CSS
    document.body.setAttribute('data-theme', effectiveTheme);
  }, [theme, mounted, getEffectiveTheme]);

  // Listen to system theme changes when theme is 'system'
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme();
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
      root.setAttribute('data-theme', effectiveTheme);
      document.body.setAttribute('data-theme', effectiveTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, mounted, getEffectiveTheme]);

  // Load theme preference from localStorage and database on mount
  useEffect(() => {
    setMounted(true);
    
    // First, check localStorage for instant load (no flash)
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      setTheme(storedTheme);
    } else {
      // Fallback to system preference or default
      setTheme('system');
    }

    // Then load from database if user is authenticated
    const loadThemeFromDatabase = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data, error } = await supabase
            .from('users')
            .select('theme_preference')
            .eq('id', session.user.id)
            .single();

          if (!error && data?.theme_preference) {
            const dbTheme = data.theme_preference;
            setTheme(dbTheme);
            localStorage.setItem('theme', dbTheme);
          }
        }
      } catch (error) {
        console.error('Error loading theme from database:', error);
      }
    };

    loadThemeFromDatabase();
  }, []);

  // Save theme preference to localStorage and database
  const saveTheme = useCallback(async (newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) {
      console.error('Invalid theme:', newTheme);
      return;
    }

    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Save to database if user is authenticated
    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { error } = await supabase
          .from('users')
          .update({ theme_preference: newTheme })
          .eq('id', session.user.id);

        if (error) {
          console.error('Error saving theme to database:', error);
        }
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    const effectiveTheme = getEffectiveTheme();
    const newTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    saveTheme(newTheme);
  }, [getEffectiveTheme, saveTheme]);

  const value = {
    theme,
    effectiveTheme: getEffectiveTheme(),
    setTheme: saveTheme,
    toggleTheme,
    mounted,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

