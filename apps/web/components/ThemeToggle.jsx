'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor, Palette, Check, Settings2, RotateCcw, Contrast } from 'lucide-react';
import { useTheme } from './providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Theme presets for quick selection - organized by category
const DARK_PRESETS = [
    { name: 'Neon', background: '#000000', foreground: '#ffffff', accent: '#00d4ff' },
    { name: 'Midnight', background: '#0a0a12', foreground: '#ffffff', accent: '#8b5cf6' },
    { name: 'Ocean', background: '#0a192f', foreground: '#ffffff', accent: '#64ffda' },
    { name: 'Forest', background: '#0d120d', foreground: '#ffffff', accent: '#84cc16' },
    { name: 'Sunset', background: '#120a0a', foreground: '#ffffff', accent: '#f97316' },
    { name: 'Rose', background: '#120812', foreground: '#ffffff', accent: '#ec4899' },
];

const LIGHT_PRESETS = [
    { name: 'Clean', background: '#ffffff', foreground: '#000000', accent: '#000000' },
    { name: 'Paper', background: '#faf8f5', foreground: '#1a1a1a', accent: '#1a1a1a' },
    { name: 'Sky', background: '#f0f9ff', foreground: '#0c4a6e', accent: '#0284c7' },
    { name: 'Mint', background: '#f0fdf4', foreground: '#14532d', accent: '#16a34a' },
];

const COLOR_PRESETS = [
    { name: 'Navy', background: '#1e3a5f', foreground: '#ffffff', accent: '#60a5fa' },
    { name: 'Plum', background: '#4a1d6b', foreground: '#ffffff', accent: '#c084fc' },
    { name: 'Wine', background: '#6b1d3a', foreground: '#ffffff', accent: '#fb7185' },
    { name: 'Teal', background: '#134e4a', foreground: '#ffffff', accent: '#5eead4' },
    { name: 'Olive', background: '#3d4a1d', foreground: '#ffffff', accent: '#bef264' },
    { name: 'Slate', background: '#334155', foreground: '#ffffff', accent: '#94a3b8' },
];

export default function ThemeToggle() {
    const { theme, setTheme, customColors, setCustomColors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        if (newTheme === 'custom') {
            setShowCustomizer(true);
        }
        setIsOpen(false);
    };

    const handleColorChange = (key, value) => {
        setCustomColors({ [key]: value });
    };

    const toggleContrast = () => {
        setCustomColors({ 
            contrast: customColors.contrast === 'high' ? 'low' : 'high' 
        });
    };

    const applyPreset = (preset) => {
        setCustomColors({
            background: preset.background,
            foreground: preset.foreground,
            accent: preset.accent,
            contrast: customColors.contrast, // Keep current contrast setting
        });
        setTheme('custom');
    };

    const resetToDefault = () => {
        setCustomColors({
            background: '#000000',
            foreground: '#ffffff',
            accent: '#00d4ff', // Neon blue
            contrast: 'high',
        });
    };

    const CurrentIcon = {
        dark: Moon,
        light: Sun,
        system: Monitor,
        custom: Palette,
    }[theme] || Moon;

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-full border bg-white/10 hover:bg-white/15 border-white/15 hover:border-white/25 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:border-black/10 text-[var(--foreground)] cursor-pointer flex items-center justify-center"
                aria-label="Toggle theme"
            >
                <CurrentIcon className="h-4 w-4" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--glass-border)] bg-[var(--dropdown-bg)] shadow-xl backdrop-blur-xl z-50 overflow-hidden">
                    <div className="p-1.5 space-y-0.5">
                        {[
                            { id: 'dark', label: 'Dark', Icon: Moon },
                            { id: 'light', label: 'Light', Icon: Sun },
                            { id: 'system', label: 'System', Icon: Monitor },
                            { id: 'custom', label: 'Custom', Icon: Palette },
                        ].map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                onClick={() => handleThemeChange(id)}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${theme === id
                                    ? 'bg-[var(--accent)]/15 text-[var(--foreground)]'
                                    : 'text-[var(--foreground)] hover:bg-white/10 [data-theme="light"]:hover:bg-black/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                </div>
                                {theme === id && <Check className="h-4 w-4 text-[var(--accent)]" />}
                            </button>
                        ))}

                        <div className="my-1.5 h-px bg-[var(--glass-border)]" />

                        <button
                            onClick={() => {
                                setTheme('custom');
                                setShowCustomizer(true);
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-white/10 [data-theme='light']:hover:bg-black/5 transition-colors cursor-pointer"
                        >
                            <Settings2 className="h-4 w-4" />
                            <span>Customize Colors</span>
                        </button>
                    </div>
                </div>
            )}

            <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
                <DialogContent className="sm:max-w-3xl bg-[var(--dropdown-bg)] [data-theme='light']:bg-white border-[var(--glass-border)] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--foreground)]">Customize Theme</DialogTitle>
                        <DialogDescription className="text-[var(--muted-foreground)]">
                            Choose a preset or create your own color scheme.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Presets */}
                        <div className="space-y-4">
                            {/* Dark Presets */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block text-[var(--foreground)]">Dark Themes</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DARK_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => applyPreset(preset)}
                                            className="group relative rounded-lg p-2 border-2 hover:scale-105 transition-all shadow-sm"
                                            style={{ 
                                                backgroundColor: preset.background,
                                                borderColor: preset.accent + '60'
                                            }}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-white/20" 
                                                    style={{ backgroundColor: preset.foreground }}
                                                />
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-white/20" 
                                                    style={{ backgroundColor: preset.accent }}
                                                />
                                            </div>
                                            <div 
                                                className="text-[10px] font-semibold"
                                                style={{ color: preset.foreground }}
                                            >
                                                {preset.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Light Presets */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block text-[var(--foreground)]">Light Themes</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    {LIGHT_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => applyPreset(preset)}
                                            className="group relative rounded-lg p-2 border-2 hover:scale-105 transition-all shadow-sm"
                                            style={{ 
                                                backgroundColor: preset.background,
                                                borderColor: preset.accent + '40'
                                            }}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-black/10" 
                                                    style={{ backgroundColor: preset.foreground }}
                                                />
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-black/10" 
                                                    style={{ backgroundColor: preset.accent }}
                                                />
                                            </div>
                                            <div 
                                                className="text-[10px] font-semibold"
                                                style={{ color: preset.foreground }}
                                            >
                                                {preset.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Presets */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block text-[var(--foreground)]">Color Themes</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => applyPreset(preset)}
                                            className="group relative rounded-lg p-2 border-2 hover:scale-105 transition-all shadow-sm"
                                            style={{ 
                                                backgroundColor: preset.background,
                                                borderColor: preset.accent + '60'
                                            }}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-white/20" 
                                                    style={{ backgroundColor: preset.foreground }}
                                                />
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-white/20" 
                                                    style={{ backgroundColor: preset.accent }}
                                                />
                                            </div>
                                            <div 
                                                className="text-[10px] font-semibold"
                                                style={{ color: preset.foreground }}
                                            >
                                                {preset.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div 
                                className="rounded-xl p-4 border-2 shadow-lg"
                                style={{ 
                                    backgroundColor: customColors.background,
                                    borderColor: customColors.accent + '40'
                                }}
                            >
                                <div 
                                    className="text-sm font-medium mb-2"
                                    style={{ color: customColors.foreground }}
                                >
                                    Live Preview
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div 
                                        className="px-2.5 py-1 rounded-md text-xs font-medium shadow-sm"
                                        style={{ 
                                            backgroundColor: customColors.foreground,
                                            color: customColors.background 
                                        }}
                                    >
                                        Primary
                                    </div>
                                    <div 
                                        className="px-2.5 py-1 rounded-md text-xs font-medium border"
                                        style={{ 
                                            borderColor: `${customColors.foreground}25`,
                                            backgroundColor: `${customColors.foreground}10`,
                                            color: customColors.foreground 
                                        }}
                                    >
                                        Secondary
                                    </div>
                                    <div 
                                        className="px-2.5 py-1 rounded-md text-xs font-medium text-white shadow-sm"
                                        style={{ backgroundColor: customColors.accent }}
                                    >
                                        Accent
                                    </div>
                                </div>
                                <div 
                                    className="mt-2 text-xs opacity-60"
                                    style={{ color: customColors.foreground }}
                                >
                                    Muted text example
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Color Pickers & Settings */}
                        <div className="space-y-4">
                            {/* Color Pickers */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-[var(--foreground)]">Custom Colors</Label>
                                
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg border-2 border-[var(--glass-border)] overflow-hidden flex-shrink-0 shadow-sm">
                                        <input
                                            type="color"
                                            value={customColors.background}
                                            onChange={(e) => handleColorChange('background', e.target.value)}
                                            className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-[var(--muted-foreground)]">Background</Label>
                                        <Input
                                            value={customColors.background}
                                            onChange={(e) => handleColorChange('background', e.target.value)}
                                            className="font-mono text-xs h-8 bg-[var(--secondary-bg)] border-[var(--glass-border)] text-[var(--foreground)]"
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg border-2 border-[var(--glass-border)] overflow-hidden flex-shrink-0 shadow-sm">
                                        <input
                                            type="color"
                                            value={customColors.foreground}
                                            onChange={(e) => handleColorChange('foreground', e.target.value)}
                                            className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-[var(--muted-foreground)]">Text Color</Label>
                                        <Input
                                            value={customColors.foreground}
                                            onChange={(e) => handleColorChange('foreground', e.target.value)}
                                            className="font-mono text-xs h-8 bg-[var(--secondary-bg)] border-[var(--glass-border)] text-[var(--foreground)]"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg border-2 border-[var(--glass-border)] overflow-hidden flex-shrink-0 shadow-sm">
                                        <input
                                            type="color"
                                            value={customColors.accent}
                                            onChange={(e) => handleColorChange('accent', e.target.value)}
                                            className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs text-[var(--muted-foreground)]">Accent Color</Label>
                                        <Input
                                            value={customColors.accent}
                                            onChange={(e) => handleColorChange('accent', e.target.value)}
                                            className="font-mono text-xs h-8 bg-[var(--secondary-bg)] border-[var(--glass-border)] text-[var(--foreground)]"
                                            placeholder="#00d4ff"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contrast Toggle */}
                            <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--secondary-bg)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Contrast className="h-4 w-4 text-[var(--accent)]" />
                                        <div>
                                            <Label className="text-sm font-medium text-[var(--foreground)]">Contrast</Label>
                                            <p className="text-[10px] text-[var(--muted-foreground)]">
                                                {customColors.contrast === 'high' ? 'High contrast' : 'Low contrast'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleContrast}
                                        className="relative w-12 h-6 rounded-full transition-colors"
                                        style={{
                                            backgroundColor: customColors.contrast === 'high' 
                                                ? customColors.accent 
                                                : 'rgba(128, 128, 128, 0.3)'
                                        }}
                                    >
                                        <span 
                                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                                                customColors.contrast === 'high' ? 'left-6' : 'left-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <p className="text-[10px] text-[var(--muted-foreground)] italic">
                                💡 Text colors are automatically adjusted for readability.
                            </p>

                            {/* Reset Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetToDefault}
                                className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary-hover)]"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset to Default
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
