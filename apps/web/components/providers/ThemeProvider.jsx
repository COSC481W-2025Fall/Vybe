'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  customColors: {
    background: '#000000',
    foreground: '#ffffff',
    accent: '#00d4ff', // Neon blue
    contrast: 'high', // 'high' or 'low'
  },
  setCustomColors: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

// RGB to hex
function rgbToHex(r, g, b) {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

// Calculate luminance (0-1)
function getLuminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Calculate contrast ratio between two colors (WCAG formula)
function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Ensure foreground contrasts enough with background
// Returns adjusted foreground if needed - STRICT enforcement
function ensureReadableContrast(background, foreground, minContrast = 7) {
  const bg = hexToRgb(background);
  const fg = hexToRgb(foreground);
  
  const bgLum = getLuminance(bg.r, bg.g, bg.b);
  const fgLum = getLuminance(fg.r, fg.g, fg.b);
  
  const contrast = getContrastRatio(bgLum, fgLum);
  
  // If contrast is already good, return original
  if (contrast >= minContrast) {
    return foreground;
  }
  
  // Otherwise, force to pure white or pure black depending on background
  if (bgLum < 0.5) {
    // Dark background - force pure white for maximum contrast
    return '#ffffff';
  } else {
    // Light background - force pure black for maximum contrast
    return '#000000';
  }
}

// Generate muted foreground that's still readable
function generateMutedForeground(background, foreground, contrastLevel) {
  const bg = hexToRgb(background);
  const bgLum = getLuminance(bg.r, bg.g, bg.b);
  
  if (bgLum < 0.5) {
    // Dark background - muted should be visible gray
    // High contrast = brighter gray, Low contrast = dimmer gray
    const brightness = contrastLevel === 'high' ? 176 : 140;
    return rgbToHex(brightness, brightness, brightness);
  } else {
    // Light background - muted should be visible dark gray
    // High contrast = darker gray, Low contrast = lighter gray
    const brightness = contrastLevel === 'high' ? 64 : 100;
    return rgbToHex(brightness, brightness, brightness);
  }
}

// Generate glass colors based on background and accent
function generateGlassColors(background, foreground, accent) {
  const bg = hexToRgb(background);
  const acc = hexToRgb(accent);
  const bgLum = getLuminance(bg.r, bg.g, bg.b);
  
  if (bgLum < 0.5) {
    // Dark background - use SOLID colors for visibility
    const glassR = Math.min(bg.r + 10, 30);
    const glassG = Math.min(bg.g + 10, 30);
    const glassB = Math.min(bg.b + 15, 40);
    
    // Solid colors for modal backgrounds
    const dropdownR = Math.min(bg.r + 5, 15);
    const dropdownG = Math.min(bg.g + 5, 15);
    const dropdownB = Math.min(bg.b + 8, 20);
    
    return {
      glassBg: rgbToHex(glassR, glassG, glassB), // SOLID
      glassBorder: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.3)`,
      glassBorderHover: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.5)`,
      glassShadow: 'rgba(0, 0, 0, 0.6)',
      dropdownBg: rgbToHex(dropdownR, dropdownG, dropdownB), // SOLID
      // Accent-based secondary styling
      secondaryBg: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.08)`,
      secondaryBorder: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.25)`,
      secondaryHover: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.15)`,
      scrollbarThumb: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.3)`,
      scrollbarThumbHover: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.5)`,
    };
  } else {
    // Light background - use SOLID white
    return {
      glassBg: '#ffffff', // SOLID white
      glassBorder: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.2)`,
      glassBorderHover: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.4)`,
      glassShadow: 'rgba(0, 0, 0, 0.15)',
      dropdownBg: '#ffffff', // SOLID white
      // Secondary styling
      secondaryBg: 'rgba(0, 0, 0, 0.03)',
      secondaryBorder: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.15)`,
      secondaryHover: 'rgba(0, 0, 0, 0.08)',
      scrollbarThumb: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.25)`,
      scrollbarThumbHover: `rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.4)`,
    };
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system');
  const [customColors, setCustomColorsState] = useState({
    background: '#000000',
    foreground: '#ffffff',
    accent: '#00d4ff', // Neon blue
    contrast: 'high',
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
        const parsed = JSON.parse(savedCustomColors);
        setCustomColorsState({
          background: parsed.background || '#000000',
          foreground: parsed.foreground || '#ffffff',
          accent: parsed.accent || '#00d4ff',
          contrast: parsed.contrast || 'high',
        });
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
      const { background, foreground, accent, contrast } = customColors;
      
      // Ensure foreground has enough contrast with background
      const safeForeground = ensureReadableContrast(background, foreground);
      const mutedForeground = generateMutedForeground(background, safeForeground, contrast);
      const glassColors = generateGlassColors(background, safeForeground, accent);
      
      // Core colors
      root.style.setProperty('--background', background);
      root.style.setProperty('--foreground', safeForeground);
      root.style.setProperty('--muted-foreground', mutedForeground);
      root.style.setProperty('--accent', accent);
      
      // Glass colors
      root.style.setProperty('--glass-bg', glassColors.glassBg);
      root.style.setProperty('--glass-border', glassColors.glassBorder);
      root.style.setProperty('--glass-border-hover', glassColors.glassBorderHover);
      root.style.setProperty('--glass-shadow', glassColors.glassShadow);
      root.style.setProperty('--dropdown-bg', glassColors.dropdownBg);
      
      // Secondary element styling (accent-influenced)
      root.style.setProperty('--secondary-bg', glassColors.secondaryBg);
      root.style.setProperty('--secondary-border', glassColors.secondaryBorder);
      root.style.setProperty('--secondary-hover', glassColors.secondaryHover);
      
      // Scrollbar
      root.style.setProperty('--scrollbar-thumb', glassColors.scrollbarThumb);
      root.style.setProperty('--scrollbar-thumb-hover', glassColors.scrollbarThumbHover);
    };

    const removeCustomColors = () => {
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--muted-foreground');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--glass-bg');
      root.style.removeProperty('--glass-border');
      root.style.removeProperty('--glass-border-hover');
      root.style.removeProperty('--glass-shadow');
      root.style.removeProperty('--dropdown-bg');
      root.style.removeProperty('--secondary-bg');
      root.style.removeProperty('--secondary-border');
      root.style.removeProperty('--secondary-hover');
      root.style.removeProperty('--scrollbar-thumb');
      root.style.removeProperty('--scrollbar-thumb-hover');
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
