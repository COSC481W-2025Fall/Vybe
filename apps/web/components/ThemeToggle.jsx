use client;

import { useState, useRef, useEffect, useCallback } from 'react';
import { Moon, Sun, Monitor, Palette, Check, Settings2 } from 'lucide-react';
import { useTheme as useCtxTheme } from '@/contexts/ThemeContext';
import { useTheme as useProvTheme } from './providers/ThemeProvider';
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

export default function ThemeToggle() {
        // Provider-based theme system (new)
        const prov = useProvTheme?.();
        // Legacy ThemeContext fallback
        const ctx = useCtxTheme?.();

        // --- CASE 1: Use new ThemeProvider system ---
        if (prov && typeof prov.setTheme === 'function') {
                const { theme, setTheme, customColors = {}, setCustomColors = () => {} } = prov;
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
                                        className="h-9 w-9 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-border-hover)] text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                                        aria-label="Toggle theme"
                                >
                                        <CurrentIcon className="h-4 w-4" />
                                </Button>

                                {isOpen && (
                                        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-xl backdrop-blur-xl z-50 overflow-hidden">
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
                                                                                        ? 'bg-[var(--glass-border-hover)] text-[var(--foreground)]'
                                                                                        : 'text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--glass-border)]'
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
                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--glass-border)] transition-colors cursor-pointer"
                                                        >
                                                                <Settings2 className="h-4 w-4" />
                                                                <span>Customize Colors</span>
                                                        </button>
                                                </div>
                                        </div>
                                )}

                                {/* Color Customizer Dialog */}
                                <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
                                        <DialogContent className="sm:max-w-md bg-[var(--background)] border-[var(--glass-border)] text-[var(--foreground)]">
                                                <DialogHeader>
                                                        <DialogTitle>Customize Theme</DialogTitle>
                                                        <DialogDescription className="opacity-60">
                                                                Pick your preferred colors for the custom theme.
                                                        </DialogDescription>
                                                </DialogHeader>

                                                <div className="grid gap-4 py-4">
                                                        {[
                                                                { id: 'background', label: 'Background' },
                                                                { id: 'foreground', label: 'Text' },
                                                                { id: 'accent', label: 'Accent' },
                                                        ].map(({ id, label }) => (
                                                                <div key={id} className="grid grid-cols-4 items-center gap-4">
                                                                        <Label htmlFor={`${id}-color`} className="text-right opacity-80">
                                                                                {label}
                                                                        </Label>
                                                                        <div className="col-span-3 flex items-center gap-2">
                                                                                <div className="h-8 w-8 rounded-full border border-[var(--glass-border)] overflow-hidden">
                                                                                        <input
                                                                                                id={`${id}-color`}
                                                                                                type="color"
                                                                                                value={customColors[id] || '#000000'}
                                                                                                onChange={(e) => handleColorChange(id, e.target.value)}
                                                                                                className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                                                                        />
                                                                                </div>
                                                                                <Input
                                                                                        value={customColors[id] || ''}
                                                                                        onChange={(e) => handleColorChange(id, e.target.value)}
                                                                                        className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--foreground)] font-mono"
                                                                                />
                                                                        </div>
                                                                </div>
                                                        ))}
                                                </div>
                                        </DialogContent>
                                </Dialog>
                        </div>
                );
        }

        // --- CASE 2: Fallback to legacy ThemeContext ---
        const { theme, toggleTheme, mounted } = ctx || {};

        const handleClick = useCallback(() => {
                if (!mounted) return;
                if (theme === 'system' || theme === 'dark') toggleTheme?.();
                else toggleTheme?.();
        }, [theme, mounted, toggleTheme]);

        if (!mounted) {
                return (
                        <button
                                className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                disabled
                        >
                                <Monitor className="h-4 w-4 opacity-70" />
                        </button>
                );
        }

        return (
                <button
                        onClick={handleClick}
                        className="group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition text-muted-foreground hover:text-foreground hover:bg-accent/50 focus:outline-none"
                        aria-label="Toggle theme"
                >
                        {theme === 'light' && <Sun className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
                        {theme === 'dark' && <Moon className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
                        {theme === 'system' && <Monitor className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
                </button>
        );
}
        >
            {theme === 'light' && <Sun className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
            {theme === 'dark' && <Moon className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
            {theme === 'system' && <Monitor className="h-4 w-4 opacity-70 group-hover:opacity-100" />}
        </button>
    );
}
