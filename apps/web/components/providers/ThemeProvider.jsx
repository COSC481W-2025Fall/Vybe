'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => {},
  customColors: {
    background: '#050507',
    foreground: '#f0f0f5',
    accent: '#a78bfa', // Soft violet (liquid glass)
    contrast: 'high', // 'high' or 'low'
  },
  setCustomColors: () => {},
  animationEnabled: true,
  setAnimationEnabled: () => {},
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
  const fg = hexToRgb(foreground);
  const acc = hexToRgb(accent);
  const bgLum = getLuminance(bg.r, bg.g, bg.b);
  
  if (bgLum < 0.5) {
    // Dark background - liquid glass effect with translucency
    return {
      // Translucent glass with subtle white overlay
      glassBg: `rgba(255, 255, 255, 0.04)`,
      glassBorder: `rgba(255, 255, 255, 0.1)`,
      glassBorderHover: `rgba(255, 255, 255, 0.18)`,
      glassShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(${acc.r}, ${acc.g}, ${acc.b}, 0.06)`,
      // Dropdown - frosted glass
      dropdownBg: `rgba(${Math.min(bg.r + 10, 30)}, ${Math.min(bg.g + 10, 30)}, ${Math.min(bg.b + 15, 40)}, 0.95)`,
      // Input - subtle elevation
      inputBg: `rgba(255, 255, 255, 0.05)`,
      // Secondary styling - accent-tinted glass
      secondaryBg: `rgba(255, 255, 255, 0.03)`,
      secondaryBorder: `rgba(255, 255, 255, 0.08)`,
      secondaryHover: `rgba(255, 255, 255, 0.08)`,
      // Subtle scrollbar
      scrollbarThumb: `rgba(255, 255, 255, 0.15)`,
      scrollbarThumbHover: `rgba(255, 255, 255, 0.25)`,
    };
  } else {
    // Light background - clean glass with subtle shadows
    return {
      glassBg: `rgba(255, 255, 255, 0.7)`,
      glassBorder: `rgba(0, 0, 0, 0.08)`,
      glassBorderHover: `rgba(0, 0, 0, 0.15)`,
      glassShadow: `0 4px 24px rgba(0, 0, 0, 0.08)`,
      dropdownBg: `rgba(255, 255, 255, 0.95)`,
      inputBg: `rgba(255, 255, 255, 0.9)`,
      // Secondary styling
      secondaryBg: `rgba(0, 0, 0, 0.02)`,
      secondaryBorder: `rgba(0, 0, 0, 0.06)`,
      secondaryHover: `rgba(0, 0, 0, 0.05)`,
      scrollbarThumb: `rgba(0, 0, 0, 0.2)`,
      scrollbarThumbHover: `rgba(0, 0, 0, 0.35)`,
    };
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system');
  const [customColors, setCustomColorsState] = useState({
    background: '#050507',
    foreground: '#f0f0f5',
    accent: '#a78bfa', // Soft violet (liquid glass)
    contrast: 'high',
  });
  const [animationEnabled, setAnimationEnabledState] = useState(true);
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
          background: parsed.background || '#0a0a0f',
          foreground: parsed.foreground || '#f0f0f5',
          accent: parsed.accent || '#a78bfa',
          contrast: parsed.contrast || 'high',
        });
      } catch (e) {
        console.error('Failed to parse custom theme', e);
        // On parse error, clear the bad data
        localStorage.removeItem('customTheme');
      }
    }

    // Load animation preference
    const savedAnimation = localStorage.getItem('animationEnabled');
    if (savedAnimation !== null) {
      setAnimationEnabledState(savedAnimation !== 'false');
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

  // Save animation preference
  const setAnimationEnabled = (enabled) => {
    setAnimationEnabledState(enabled);
    localStorage.setItem('animationEnabled', enabled.toString());
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
      root.style.setProperty('--input-bg', glassColors.inputBg);
      
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
      root.style.removeProperty('--input-bg');
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
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors, animationEnabled, setAnimationEnabled, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Export helper functions for live preview in ThemeToggle
export { hexToRgb, getLuminance, ensureReadableContrast, generateMutedForeground, generateGlassColors };

