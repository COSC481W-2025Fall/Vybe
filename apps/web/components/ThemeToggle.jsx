'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Moon, Sun, Monitor, Palette, Check, Settings2, RotateCcw, Contrast, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTheme, ensureReadableContrast, generateMutedForeground, generateGlassColors } from './providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ============ CONTRAST UTILITIES ============
// Calculate relative luminance for WCAG contrast
function getLuminance(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check if contrast meets WCAG AA (4.5:1 for normal text)
function meetsWCAGAA(color1, color2) {
  return getContrastRatio(color1, color2) >= 4.5;
}

// Check if contrast meets WCAG AAA (7:1 for normal text)
function meetsWCAGAAA(color1, color2) {
  return getContrastRatio(color1, color2) >= 7;
}

// ============ AUTO-FIX CONTRAST ============
// Lighten a color by a percentage
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Darken a color by a percentage
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Auto-fix foreground color to meet contrast against background
function autoFixForeground(background, foreground, minContrast = 4.5) {
  let currentContrast = getContrastRatio(background, foreground);
  if (currentContrast >= minContrast) return foreground;
  
  const bgLuminance = getLuminance(background);
  const isLightBg = bgLuminance > 0.5;
  
  // Determine if we should lighten or darken the foreground
  let fixedColor = foreground;
  let step = 5;
  let iterations = 0;
  const maxIterations = 50;
  
  while (currentContrast < minContrast && iterations < maxIterations) {
    if (isLightBg) {
      // Light background: darken the foreground
      fixedColor = darkenColor(fixedColor, step);
    } else {
      // Dark background: lighten the foreground
      fixedColor = lightenColor(fixedColor, step);
    }
    currentContrast = getContrastRatio(background, fixedColor);
    iterations++;
  }
  
  // If still not meeting contrast, go to extreme
  if (currentContrast < minContrast) {
    return isLightBg ? '#000000' : '#ffffff';
  }
  
  return fixedColor;
}

// Auto-fix accent color (lower requirement - 3:1 for UI components)
function autoFixAccent(background, accent, minContrast = 3) {
  let currentContrast = getContrastRatio(background, accent);
  if (currentContrast >= minContrast) return accent;
  
  const bgLuminance = getLuminance(background);
  const isLightBg = bgLuminance > 0.5;
  
  let fixedColor = accent;
  let step = 5;
  let iterations = 0;
  const maxIterations = 30;
  
  while (currentContrast < minContrast && iterations < maxIterations) {
    if (isLightBg) {
      fixedColor = darkenColor(fixedColor, step);
    } else {
      fixedColor = lightenColor(fixedColor, step);
    }
    currentContrast = getContrastRatio(background, fixedColor);
    iterations++;
  }
  
  return fixedColor;
}

// Full auto-fix that adjusts all colors
function autoFixAllColors(background, foreground, accent) {
  const fixedForeground = autoFixForeground(background, foreground, 4.5);
  const fixedAccent = autoFixAccent(background, accent, 3);
  
  return {
    background,
    foreground: fixedForeground,
    accent: fixedAccent,
    wasFixed: fixedForeground !== foreground || fixedAccent !== accent,
  };
}

// Generate tints (lighter) and shades (darker) of a color
function generateTintsAndShades(hexColor) {
  const hex = hexColor.replace('#', '');
  let r = parseInt(hex.substr(0, 2), 16);
  let g = parseInt(hex.substr(2, 2), 16);
  let b = parseInt(hex.substr(4, 2), 16);
  
  const tints = [];
  const shades = [];
  
  // Generate 4 tints (lighter versions)
  for (let i = 1; i <= 4; i++) {
    const factor = i * 0.2;
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);
    tints.push(`#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`);
  }
  
  // Generate 4 shades (darker versions)
  for (let i = 1; i <= 4; i++) {
    const factor = 1 - (i * 0.2);
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    shades.push(`#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`);
  }
  
  return { base: hexColor, tints, shades };
}

// Color grid palette
const COLOR_GRID = [
  // Row 1: Theme colors
  ['#000000', '#1a1a2e', '#16213e', '#0f3460', '#533483', '#7952b3', '#e94560', '#ff6b6b', '#feca57', '#1dd1a1'],
  // Row 2: Standard colors
  ['#c0392b', '#e74c3c', '#9b59b6', '#8e44ad', '#2980b9', '#3498db', '#1abc9c', '#16a085', '#27ae60', '#2ecc71'],
  // Row 3: Neutral colors
  ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529'],
];

// Theme presets with full palette info
const DARK_PRESETS = [
  { name: 'Liquid Glass', background: '#050507', foreground: '#f0f0f5', accent: '#a78bfa', description: 'Frosted glass with violet glow' },
  { name: 'Neon', background: '#000000', foreground: '#ffffff', accent: '#00d4ff', description: 'Pure black with neon blue' },
  { name: 'Midnight', background: '#050508', foreground: '#e8e8f0', accent: '#8b5cf6', description: 'Deep purple vibes' },
  { name: 'Rose', background: '#0f0a0a', foreground: '#fff0f0', accent: '#f43f5e', description: 'Dark with rose accents' },
  { name: 'Ember', background: '#0f0a05', foreground: '#fff5e8', accent: '#f97316', description: 'Warm orange glow' },
  { name: 'Forest', background: '#050f0a', foreground: '#e8fff0', accent: '#22c55e', description: 'Nature green theme' },
  { name: 'Ocean', background: '#050a0f', foreground: '#e8f5ff', accent: '#0ea5e9', description: 'Deep sea blue' },
];

const LIGHT_PRESETS = [
  { name: 'Clean', background: '#ffffff', foreground: '#000000', accent: '#000000', description: 'High contrast pure white' },
  { name: 'Paper', background: '#fafaf9', foreground: '#1c1917', accent: '#78716c', description: 'Warm paper-like feel' },
  { name: 'Sky', background: '#f0f9ff', foreground: '#0c4a6e', accent: '#0284c7', description: 'Light blue tint' },
  { name: 'Mint', background: '#f0fdf4', foreground: '#14532d', accent: '#16a34a', description: 'Fresh green tint' },
  { name: 'Lavender', background: '#faf5ff', foreground: '#581c87', accent: '#9333ea', description: 'Soft purple hue' },
  { name: 'Peach', background: '#fff7ed', foreground: '#9a3412', accent: '#ea580c', description: 'Warm peachy tone' },
];

const COLOR_PRESETS = [
  { name: 'Navy', background: '#1e3a5f', foreground: '#ffffff', accent: '#60a5fa', description: 'Deep navy blue' },
  { name: 'Plum', background: '#3b1f4a', foreground: '#ffffff', accent: '#c084fc', description: 'Rich plum purple' },
  { name: 'Wine', background: '#4a1f2e', foreground: '#ffffff', accent: '#fb7185', description: 'Deep wine red' },
  { name: 'Teal', background: '#134e4a', foreground: '#ffffff', accent: '#2dd4bf', description: 'Ocean teal' },
  { name: 'Olive', background: '#3f4a1f', foreground: '#ffffff', accent: '#a3e635', description: 'Earthy olive green' },
  { name: 'Slate', background: '#1e293b', foreground: '#f8fafc', accent: '#94a3b8', description: 'Modern slate gray' },
];

// Default theme values (matches liquid glass dark mode)
const DEFAULT_THEME = {
  background: '#050507',
  foreground: '#f0f0f5',
  accent: '#a78bfa', // Soft violet
  contrast: 'high',
};

// Contrast Status Component with Auto-Fix
function ContrastStatus({ background, foreground, accent, onAutoFix }) {
  const textContrast = useMemo(() => getContrastRatio(background, foreground), [background, foreground]);
  const accentContrast = useMemo(() => getContrastRatio(background, accent), [background, accent]);
  
  const textMeetsAA = textContrast >= 4.5;
  const textMeetsAAA = textContrast >= 7;
  const accentMeetsAA = accentContrast >= 3; // Accent can be lower for large text/UI
  
  const hasIssues = !textMeetsAA || !accentMeetsAA;
  
  const handleAutoFix = () => {
    const fixed = autoFixAllColors(background, foreground, accent);
    if (fixed.wasFixed && onAutoFix) {
      onAutoFix(fixed);
    }
  };
  
  return (
    <div className={`p-3 rounded-lg border ${hasIssues ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasIssues ? (
            <AlertTriangle className="h-4 w-4 text-yellow-400" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-400" aria-hidden="true" />
          )}
          <span className={`text-sm font-medium ${hasIssues ? 'text-yellow-400' : 'text-green-400'}`}>
            {hasIssues ? 'Contrast Issues' : 'Good Contrast'}
          </span>
        </div>
        {hasIssues && onAutoFix && (
          <button
            onClick={handleAutoFix}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-md transition-colors"
          >
            <Contrast className="h-3 w-3" />
            Auto-Fix
          </button>
        )}
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[var(--muted-foreground)]">Text:</span>
          <span className={`font-mono ${textMeetsAA ? 'text-green-400' : 'text-red-400'}`}>
            {textContrast.toFixed(1)}:1 {textMeetsAAA ? '✓✓' : textMeetsAA ? '✓' : '✗'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--muted-foreground)]">Accent:</span>
          <span className={`font-mono ${accentMeetsAA ? 'text-green-400' : 'text-yellow-400'}`}>
            {accentContrast.toFixed(1)}:1 {accentMeetsAA ? '✓' : '✗'}
          </span>
        </div>
      </div>
      
      {hasIssues && (
        <p className="text-[10px] text-yellow-400/70 mt-2">
          Click "Auto-Fix" to automatically adjust colors for accessibility.
        </p>
      )}
    </div>
  );
}

// Color Picker Grid Component
function ColorPickerGrid({ onSelectColor, selectedColor, label, filterLowContrast, contrastAgainst }) {
  const [showMore, setShowMore] = useState(false);
  const [customColor, setCustomColor] = useState('');
  
  // Generate tints and shades for the first row (theme colors)
  const expandedColors = useMemo(() => {
    if (!showMore) return COLOR_GRID;
    
    // Add tints and shades rows
    const baseColors = COLOR_GRID[0];
    const result = [...COLOR_GRID];
    
    // Add lighter tints
    const tints1 = baseColors.map(c => generateTintsAndShades(c).tints[0]);
    const tints2 = baseColors.map(c => generateTintsAndShades(c).tints[2]);
    result.splice(1, 0, tints1, tints2);
    
    // Add darker shades
    const shades1 = baseColors.map(c => generateTintsAndShades(c).shades[0]);
    const shades2 = baseColors.map(c => generateTintsAndShades(c).shades[2]);
    result.push(shades1, shades2);
    
    return result;
  }, [showMore]);
  
  // Check if a color should be disabled due to low contrast
  const isLowContrast = useCallback((color) => {
    if (!filterLowContrast || !contrastAgainst) return false;
    return getContrastRatio(color, contrastAgainst) < 3;
  }, [filterLowContrast, contrastAgainst]);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-[var(--muted-foreground)]">{label}</Label>
      
      {/* Color Grid - Responsive: wraps on mobile */}
      <div className="space-y-1 overflow-x-auto">
        {expandedColors.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-0.5 sm:gap-1 min-w-0">
            {row.map((color, colIdx) => {
              const lowContrast = isLowContrast(color);
              const isSelected = selectedColor?.toLowerCase() === color.toLowerCase();
              
              return (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => !lowContrast && onSelectColor(color)}
                  disabled={lowContrast}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 transition-all flex-shrink-0 ${
                    isSelected 
                      ? 'border-[var(--foreground)] ring-1 sm:ring-2 ring-[var(--accent)] scale-110' 
                      : 'border-transparent hover:border-[var(--glass-border)] hover:scale-105'
                  } ${lowContrast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ backgroundColor: color }}
                  title={lowContrast ? `${color} - Low contrast (disabled)` : color}
                  aria-label={`Select color ${color}${lowContrast ? ' (disabled - low contrast)' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* More Colors / Custom */}
      <div className="flex items-center gap-1 sm:gap-2 pt-1">
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-[var(--accent)] hover:underline whitespace-nowrap"
        >
          {showMore ? 'Less' : 'More...'}
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={customColor || selectedColor || '#000000'}
            onChange={(e) => {
              setCustomColor(e.target.value);
              onSelectColor(e.target.value);
            }}
            className="w-5 h-5 rounded border border-[var(--glass-border)] cursor-pointer flex-shrink-0"
            aria-label="Choose custom color"
            title="Pick custom color"
          />
          <Input
            value={customColor || selectedColor || ''}
            onChange={(e) => {
              const val = e.target.value;
              setCustomColor(val);
              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                onSelectColor(val);
              }
            }}
            placeholder="#hex"
            className="w-14 sm:w-16 h-5 text-xs font-mono px-1"
          />
        </div>
      </div>
    </div>
  );
}

function ProviderThemeToggle({ prov }) {
  const { theme, setTheme, customColors = {}, setCustomColors = () => {}, animationEnabled = true, setAnimationEnabled = () => {} } = prov;
    const [isOpen, setIsOpen] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const dropdownRef = useRef(null);
    
    // Draft colors - only applied when user clicks "Apply Theme"
    const [draftColors, setDraftColors] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Store original colors and theme when customizer opens for reverting
    const [originalColors, setOriginalColors] = useState(null);
    const [originalTheme, setOriginalTheme] = useState(null);
    
    // Initialize draft colors when customizer opens
    useEffect(() => {
      if (showCustomizer) {
        const currentColors = {
          background: customColors.background || DEFAULT_THEME.background,
          foreground: customColors.foreground || DEFAULT_THEME.foreground,
          accent: customColors.accent || DEFAULT_THEME.accent,
          contrast: customColors.contrast || DEFAULT_THEME.contrast,
        };
        setOriginalColors(currentColors);
        setOriginalTheme(theme);
        setDraftColors(currentColors);
        setHasChanges(false);
      }
    }, [showCustomizer]);
    
    // Apply draft colors to page in real-time for live preview
    useEffect(() => {
      if (showCustomizer && draftColors) {
        const root = document.documentElement;
        const { background, foreground, accent, contrast } = draftColors;
        
        // Ensure foreground has enough contrast with background
        const safeForeground = ensureReadableContrast(background, foreground);
        const mutedForeground = generateMutedForeground(background, safeForeground, contrast);
        const glassColors = generateGlassColors(background, safeForeground, accent);
        
        // Set data-theme to custom so CSS knows we're in custom mode
        root.setAttribute('data-theme', 'custom');
        
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
        
        // Secondary element styling
        root.style.setProperty('--secondary-bg', glassColors.secondaryBg);
        root.style.setProperty('--secondary-border', glassColors.secondaryBorder);
        root.style.setProperty('--secondary-hover', glassColors.secondaryHover);
        
        // Scrollbar
        root.style.setProperty('--scrollbar-thumb', glassColors.scrollbarThumb);
        root.style.setProperty('--scrollbar-thumb-hover', glassColors.scrollbarThumbHover);
        
        // Accent-based glass effects
        root.style.setProperty('--accent-rgb', glassColors.accentRgb);
        root.style.setProperty('--glass-accent-glow', glassColors.glassAccentGlow);
        root.style.setProperty('--glass-accent-glow-hover', glassColors.glassAccentGlowHover);
        root.style.setProperty('--glass-accent-tint', glassColors.glassAccentTint);
        root.style.setProperty('--glass-accent-tint-hover', glassColors.glassAccentTintHover);
        
        // Also update body background for immediate visual feedback
        document.body.style.backgroundColor = background;
      }
    }, [showCustomizer, draftColors]);

    useEffect(() => {
    function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
    }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
    if (newTheme === 'custom') setShowCustomizer(true);
        setIsOpen(false);
    };

    // Update draft colors (not applied yet)
    const handleColorChange = (key, value) => {
        setDraftColors(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

  const toggleContrast = () => {
    const newContrast = (draftColors?.contrast || customColors.contrast) === 'high' ? 'low' : 'high';
    setDraftColors(prev => ({ ...prev, contrast: newContrast }));
    setHasChanges(true);
  };

  // Apply a preset to draft (not applied yet)
  const applyPreset = (preset) => {
    setDraftColors({
      background: preset.background,
      foreground: preset.foreground,
      accent: preset.accent,
      contrast: draftColors?.contrast || customColors.contrast || 'high',
    });
    setHasChanges(true);
  };

  // Actually apply the theme (colors are already applied via live preview)
  const applyTheme = () => {
    if (draftColors) {
      setCustomColors(draftColors);
      setTheme('custom');
      setHasChanges(false);
    }
    setOriginalColors(null);
    setOriginalTheme(null);
    setShowCustomizer(false);
  };

  // Cancel without applying - revert to original colors
  const cancelCustomizer = () => {
    // Revert CSS variables to original colors
    if (originalColors) {
      const root = document.documentElement;
      const { background, foreground, accent, contrast } = originalColors;
      
      // Restore all CSS variables
      const safeForeground = ensureReadableContrast(background, foreground);
      const mutedForeground = generateMutedForeground(background, safeForeground, contrast);
      const glassColors = generateGlassColors(background, safeForeground, accent);
      
      // Restore data-theme
      const restoreTheme = originalTheme || theme;
      root.setAttribute('data-theme', restoreTheme === 'custom' ? 'custom' : restoreTheme);
      
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
      
      // Secondary element styling
      root.style.setProperty('--secondary-bg', glassColors.secondaryBg);
      root.style.setProperty('--secondary-border', glassColors.secondaryBorder);
      root.style.setProperty('--secondary-hover', glassColors.secondaryHover);
      
      // Scrollbar
      root.style.setProperty('--scrollbar-thumb', glassColors.scrollbarThumb);
      root.style.setProperty('--scrollbar-thumb-hover', glassColors.scrollbarThumbHover);
      
      // Accent-based glass effects
      root.style.setProperty('--accent-rgb', glassColors.accentRgb);
      root.style.setProperty('--glass-accent-glow', glassColors.glassAccentGlow);
      root.style.setProperty('--glass-accent-glow-hover', glassColors.glassAccentGlowHover);
      root.style.setProperty('--glass-accent-tint', glassColors.glassAccentTint);
      root.style.setProperty('--glass-accent-tint-hover', glassColors.glassAccentTintHover);
      
      document.body.style.backgroundColor = background;
    } else if (originalTheme !== 'custom') {
      // If we weren't in custom mode, remove the inline styles to let CSS take over
      const root = document.documentElement;
      const restoreTheme = originalTheme || theme;
      root.setAttribute('data-theme', restoreTheme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
        : restoreTheme);
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
      root.style.removeProperty('--accent-rgb');
      root.style.removeProperty('--glass-accent-glow');
      root.style.removeProperty('--glass-accent-glow-hover');
      root.style.removeProperty('--glass-accent-tint');
      root.style.removeProperty('--glass-accent-tint-hover');
      document.body.style.removeProperty('background-color');
    }
    setDraftColors(null);
    setOriginalColors(null);
    setOriginalTheme(null);
    setHasChanges(false);
    setShowCustomizer(false);
  };

  const resetToDefault = () => {
    // Clear custom colors from state AND localStorage
    setCustomColors(DEFAULT_THEME);
    localStorage.removeItem('customTheme');
    // Switch to dark mode (liquid glass)
    setTheme('dark');
    setOriginalColors(null);
    setOriginalTheme(null);
    setShowCustomizer(false);
  };
  
  // Use draft colors for preview, fall back to current custom colors
  const previewColors = draftColors || customColors;

    const CurrentIcon = {
        dark: Moon,
        light: Sun,
        system: Monitor,
        custom: Palette,
    }[theme] || Moon;

  const isHighContrast = (previewColors.contrast || 'high') !== 'low';

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
        onClick={() => setIsOpen((s) => !s)}
        className="h-9 w-9 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-border-hover)] text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                aria-label="Toggle theme"
            >
                <CurrentIcon className="h-4 w-4" />
            </Button>

            {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--glass-border)] bg-[var(--dropdown-bg)] shadow-xl backdrop-blur-xl z-50 overflow-hidden">
                    <div className="p-1 space-y-1">
                        {[
                            { id: 'dark', label: 'Dark', Icon: Moon },
                            { id: 'light', label: 'Light', Icon: Sun },
                            { id: 'system', label: 'System', Icon: Monitor },
                            { id: 'custom', label: 'Custom', Icon: Palette },
                        ].map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                onClick={() => handleThemeChange(id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                  theme === id
                    ? 'bg-[var(--secondary-hover)] text-[var(--foreground)]'
                    : 'text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--secondary-bg)]'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                </div>
                                {theme === id && <Check className="h-3 w-3" />}
                            </button>
                        ))}

                        <div className="my-1 h-px bg-[var(--glass-border)]" />

                        {/* Animation Toggle */}
                        <button
                            onClick={() => setAnimationEnabled(!animationEnabled)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--secondary-bg)] transition-colors cursor-pointer"
                        >
                            <span>Background Animation</span>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              animationEnabled 
                                ? 'bg-[var(--accent)] border-[var(--accent)]' 
                                : 'border-[var(--glass-border)]'
                            }`}>
                              {animationEnabled && <Check className="h-3 w-3 text-white" />}
                            </div>
                        </button>

                        <div className="my-1 h-px bg-[var(--glass-border)]" />

                        <button
                            onClick={() => {
                                setTheme('custom');
                                setShowCustomizer(true);
                                setIsOpen(false);
                            }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--secondary-bg)] transition-colors cursor-pointer"
                        >
                            <Settings2 className="h-4 w-4" />
                            <span>Customize Colors</span>
                        </button>
                    </div>
                </div>
            )}

            <Dialog open={showCustomizer} onOpenChange={(open) => { if (!open) cancelCustomizer(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">Theme Customizer</DialogTitle>
            <DialogDescription className="text-[var(--muted-foreground)]">
              Choose a preset theme or create your own custom color scheme.
                        </DialogDescription>
                    </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            {/* Column 1 - Dark & Light Presets */}
            <div className="space-y-4">
              {/* Dark Presets */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Moon className="h-4 w-4" /> Dark Themes
                </h3>
                <div className="space-y-2">
                  {DARK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--glass-border)] hover:border-[var(--accent)] transition-all cursor-pointer group"
                    >
                      {/* Color preview - background with accent ring */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: preset.background,
                          border: `3px solid ${preset.accent}`,
                          boxShadow: `0 0 0 1px rgba(255,255,255,0.1), inset 0 0 8px ${preset.accent}40`
                        }}
                      >
                        <span 
                          className="text-xs font-bold"
                          style={{ color: preset.foreground }}
                        >
                          Aa
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[var(--foreground)]">{preset.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)] opacity-70">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Light Presets */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Sun className="h-4 w-4" /> Light Themes
                </h3>
                <div className="space-y-2">
                  {LIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--glass-border)] hover:border-[var(--accent)] transition-all cursor-pointer group"
                    >
                      {/* Color preview - background with accent ring */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: preset.background,
                          border: `3px solid ${preset.accent}`,
                          boxShadow: `0 0 0 1px rgba(0,0,0,0.05)`
                        }}
                      >
                        <span 
                          className="text-xs font-bold"
                          style={{ color: preset.foreground }}
                        >
                          Aa
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[var(--foreground)]">{preset.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)] opacity-70">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2 - Color Presets */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Color Themes
                </h3>
                <div className="space-y-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--glass-border)] hover:border-[var(--accent)] transition-all cursor-pointer group"
                    >
                      {/* Color preview - background with accent ring */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: preset.background,
                          border: `3px solid ${preset.accent}`,
                          boxShadow: `0 0 0 1px rgba(255,255,255,0.1), inset 0 0 8px ${preset.accent}40`
                        }}
                      >
                        <span 
                          className="text-xs font-bold"
                          style={{ color: preset.foreground }}
                        >
                          Aa
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[var(--foreground)]">{preset.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)] opacity-70">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrast Toggle - Compact inline style */}
              <button
                onClick={toggleContrast}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--glass-border)] hover:border-[var(--accent)] bg-[var(--secondary-bg)] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center border-2"
                    style={{ 
                      background: isHighContrast ? 'var(--background)' : 'var(--secondary-bg)',
                      borderColor: 'var(--accent)',
                    }}
                  >
                    <Contrast className="h-4 w-4 text-[var(--foreground)]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">Contrast</p>
                    <p className="text-xs text-[var(--muted-foreground)] opacity-70">
                      {isHighContrast ? 'High: Maximum visibility' : 'Low: Softer'}
                    </p>
                  </div>
                </div>
                {/* Small toggle indicator */}
                <div className={`w-8 h-5 rounded-full transition-colors flex-shrink-0 flex items-center ${
                  isHighContrast ? 'bg-[var(--accent)] justify-end' : 'bg-[var(--glass-border)] justify-start'
                }`}>
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm mx-0.5" />
                </div>
              </button>
                        </div>

            {/* Column 3 - Custom Colors & Preview */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Custom Colors
              </h3>
              
              {/* Background Color Picker */}
              <ColorPickerGrid
                label="Background Color"
                selectedColor={previewColors.background || '#000000'}
                onSelectColor={(color) => handleColorChange('background', color)}
              />
              
              {/* Text Color Picker */}
              <ColorPickerGrid
                label="Text Color"
                selectedColor={previewColors.foreground || '#ffffff'}
                onSelectColor={(color) => handleColorChange('foreground', color)}
                filterLowContrast={true}
                contrastAgainst={previewColors.background || '#000000'}
              />
              
              {/* Accent Color Picker */}
              <ColorPickerGrid
                label="Accent Color"
                selectedColor={previewColors.accent || '#00d4ff'}
                onSelectColor={(color) => handleColorChange('accent', color)}
                filterLowContrast={true}
                contrastAgainst={previewColors.background || '#000000'}
              />
              
              {/* Contrast Status with Auto-Fix */}
              <ContrastStatus
                background={previewColors.background || '#000000'}
                foreground={previewColors.foreground || '#ffffff'}
                accent={previewColors.accent || '#00d4ff'}
                onAutoFix={(fixed) => {
                  setDraftColors({
                    background: fixed.background,
                    foreground: fixed.foreground,
                    accent: fixed.accent,
                    contrast: previewColors.contrast || 'high',
                  });
                  setHasChanges(true);
                }}
              />

              {/* Preview Card */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">Preview Card <span className="text-xs font-normal text-[var(--muted-foreground)]">(page updates live)</span></h4>
                {/* Page background */}
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: previewColors.background || '#000000',
                  }}
                >
                  {/* Card (slightly elevated from background) */}
                  <div
                    className="p-3 rounded-lg border-2 shadow-lg"
                    style={{
                      background: (() => {
                        const bg = previewColors.background || '#000000';
                        const r = parseInt(bg.slice(1, 3), 16);
                        const g = parseInt(bg.slice(3, 5), 16);
                        const b = parseInt(bg.slice(5, 7), 16);
                        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                        if (lum < 0.5) {
                          // Dark - lighten
                          return `rgb(${Math.min(r + 15, 255)}, ${Math.min(g + 15, 255)}, ${Math.min(b + 20, 255)})`;
                        } else {
                          // Light - darken slightly
                          return `rgb(${Math.max(r - 8, 240)}, ${Math.max(g - 8, 240)}, ${Math.max(b - 8, 240)})`;
                        }
                      })(),
                      borderColor: previewColors.accent || '#00d4ff',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ background: previewColors.accent || '#00d4ff' }}
                      />
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: previewColors.foreground || '#ffffff' }}
                        >
                          Display Name
                        </p>
                        <p
                          className="text-[10px] opacity-60"
                          style={{ color: previewColors.foreground || '#ffffff' }}
                        >
                          @username
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: previewColors.foreground || '#ffffff' }}
                    >
                      Card content preview
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        className="px-2 py-1 rounded text-[10px] font-medium"
                        style={{
                          background: previewColors.foreground || '#ffffff',
                          color: previewColors.background || '#000000',
                        }}
                      >
                        Primary
                      </button>
                      <button
                        className="px-2 py-1 rounded text-[10px] font-medium border"
                        style={{
                          background: 'transparent',
                          color: previewColors.foreground || '#ffffff',
                          borderColor: previewColors.accent || '#00d4ff',
                        }}
                      >
                        Secondary
                      </button>
                      <button
                        className="px-2 py-1 rounded text-[10px] font-medium text-white"
                        style={{ background: previewColors.accent || '#00d4ff' }}
                      >
                                Accent
                      </button>
                                </div>
                            </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
                {/* Apply Theme Button */}
                <button
                  onClick={applyTheme}
                  disabled={!hasChanges}
                  className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-all ${
                    hasChanges
                      ? 'bg-gradient-to-r from-[var(--accent)] to-pink-600 hover:opacity-90 text-white shadow-lg'
                      : 'bg-[var(--secondary-bg)] text-[var(--muted-foreground)] cursor-not-allowed'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{hasChanges ? 'Apply Theme' : 'No Changes'}</span>
                </button>
                
                {/* Cancel / Reset Row */}
                <div className="flex gap-2">
                  <button
                    onClick={cancelCustomizer}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-[var(--glass-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
                  >
                    <span className="text-sm">Cancel</span>
                  </button>
                  <button
                    onClick={resetToDefault}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-[var(--glass-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-sm">Reset</span>
                  </button>
                </div>
              </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ThemeToggle() {
  const prov = useTheme();
  return <ProviderThemeToggle prov={prov} />;
}
