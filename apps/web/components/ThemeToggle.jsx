'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Moon, Sun, Monitor, Palette, Check, Settings2, RotateCcw, Contrast } from 'lucide-react';
import { useTheme as useCtxTheme } from '@/contexts/ThemeContext';
import { useTheme as useProvTheme } from './providers/ThemeProvider';
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

// Theme presets with full palette info
const DARK_PRESETS = [
  { name: 'Neon', background: '#000000', foreground: '#ffffff', accent: '#00d4ff', description: 'Pure black with neon blue' },
  { name: 'Midnight', background: '#0a0a0f', foreground: '#ffffff', accent: '#8b5cf6', description: 'Deep purple vibes' },
  { name: 'Rose', background: '#0f0a0a', foreground: '#ffffff', accent: '#f43f5e', description: 'Dark with rose accents' },
  { name: 'Ember', background: '#0f0a05', foreground: '#ffffff', accent: '#f97316', description: 'Warm orange glow' },
  { name: 'Forest', background: '#050f0a', foreground: '#ffffff', accent: '#22c55e', description: 'Nature green theme' },
  { name: 'Ocean', background: '#050a0f', foreground: '#ffffff', accent: '#0ea5e9', description: 'Deep sea blue' },
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

// Default theme values
const DEFAULT_THEME = {
  background: '#000000',
  foreground: '#ffffff',
  accent: '#00d4ff',
  contrast: 'high',
};

function ProviderThemeToggle({ prov }) {
  const { theme, setTheme, customColors = {}, setCustomColors = () => {} } = prov;
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleColorChange = (key, value) => {
    setCustomColors({ [key]: value });
  };

  const toggleContrast = () => {
    const newContrast = customColors.contrast === 'high' ? 'low' : 'high';
    setCustomColors({ contrast: newContrast });
  };

  const applyPreset = (preset) => {
    setCustomColors({
      background: preset.background,
      foreground: preset.foreground,
      accent: preset.accent,
      contrast: customColors.contrast || 'high',
    });
    setTheme('custom');
  };

  const resetToDefault = () => {
    setCustomColors(DEFAULT_THEME);
    setTheme('dark');
  };

  const CurrentIcon = {
    dark: Moon,
    light: Sun,
    system: Monitor,
    custom: Palette,
  }[theme] || Moon;

  const isHighContrast = customColors.contrast !== 'low';

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

      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
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

              {/* Contrast Toggle */}
              <div className="p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--secondary-bg)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Contrast className="h-4 w-4 text-[var(--foreground)]" />
                    <span className="text-sm font-medium text-[var(--foreground)]">Contrast Mode</span>
                  </div>
                  <button
                    onClick={toggleContrast}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      isHighContrast ? 'bg-[var(--accent)]' : 'bg-[var(--glass-border)]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isHighContrast ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {isHighContrast 
                    ? 'High contrast: Maximum text visibility' 
                    : 'Low contrast: Softer, muted appearance'}
                </p>
              </div>
            </div>

            {/* Column 3 - Custom Colors & Preview */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Custom Colors
              </h3>
              
              {[
                { id: 'background', label: 'Background', default: '#000000' },
                { id: 'foreground', label: 'Text', default: '#ffffff' },
                { id: 'accent', label: 'Accent', default: '#00d4ff' },
              ].map(({ id, label, default: defaultVal }) => (
                <div key={id} className="flex items-center gap-3">
                  <Label htmlFor={`${id}-color`} className="w-20 text-sm text-[var(--muted-foreground)]">
                    {label}
                  </Label>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-9 w-9 rounded-lg border-2 border-[var(--glass-border)] overflow-hidden flex-shrink-0 shadow-sm">
                      <input
                        id={`${id}-color`}
                        type="color"
                        value={customColors[id] || defaultVal}
                        onChange={(e) => handleColorChange(id, e.target.value)}
                        className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                      />
                    </div>
                    <Input
                      value={customColors[id] || ''}
                      onChange={(e) => handleColorChange(id, e.target.value)}
                      className="font-mono text-xs"
                      placeholder={defaultVal}
                    />
                  </div>
                </div>
              ))}

              {/* Live Preview */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">Live Preview</h4>
                {/* Page background */}
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: customColors.background || '#000000',
                  }}
                >
                  {/* Card (slightly elevated from background) */}
                  <div
                    className="p-3 rounded-lg border-2 shadow-lg"
                    style={{
                      background: (() => {
                        const bg = customColors.background || '#000000';
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
                      borderColor: customColors.accent || '#00d4ff',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ background: customColors.accent || '#00d4ff' }}
                      />
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: customColors.foreground || '#ffffff' }}
                        >
                          Display Name
                        </p>
                        <p
                          className="text-[10px] opacity-60"
                          style={{ color: customColors.foreground || '#ffffff' }}
                        >
                          @username
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-xs mb-2"
                      style={{ color: customColors.foreground || '#ffffff' }}
                    >
                      Card content preview
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        className="px-2 py-1 rounded text-[10px] font-medium"
                        style={{
                          background: customColors.foreground || '#ffffff',
                          color: customColors.background || '#000000',
                        }}
                      >
                        Primary
                      </button>
                      <button
                        className="px-2 py-1 rounded text-[10px] font-medium border"
                        style={{
                          background: 'transparent',
                          color: customColors.foreground || '#ffffff',
                          borderColor: customColors.accent || '#00d4ff',
                        }}
                      >
                        Secondary
                      </button>
                      <button
                        className="px-2 py-1 rounded text-[10px] font-medium text-white"
                        style={{ background: customColors.accent || '#00d4ff' }}
                      >
                        Accent
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetToDefault}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-[var(--glass-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Reset to Default</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegacyThemeToggle({ ctx }) {
  const { theme, toggleTheme, mounted } = ctx || {};

  const handleClick = useCallback(() => {
    if (!mounted) return;
    toggleTheme?.();
  }, [mounted, toggleTheme]);

  if (!mounted) {
    return (
      <button className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50" disabled>
        <Monitor className="h-4 w-4 opacity-70" />
      </button>
    );
  }

  return (
    <button onClick={handleClick} className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition text-muted-foreground hover:text-foreground hover:bg-accent/50 focus:outline-none" aria-label="Toggle theme">
      {theme === 'light' && <Sun className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
      {theme === 'dark' && <Moon className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
      {theme === 'system' && <Monitor className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
    </button>
  );
}

export default function ThemeToggle() {
  let prov;
  try {
    prov = useProvTheme();
  } catch (e) {
    prov = undefined;
  }

  let ctx;
  try {
    ctx = useCtxTheme();
  } catch (e) {
    ctx = undefined;
  }

  if (prov && typeof prov.setTheme === 'function') {
    return <ProviderThemeToggle prov={prov} />;
  }

  return <LegacyThemeToggle ctx={ctx} />;
}
