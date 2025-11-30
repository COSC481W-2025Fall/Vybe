'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor, Palette, Check, Settings2 } from 'lucide-react';
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
                className="h-9 w-9 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-border-hover)] text-[var(--foreground)] cursor-pointer flex items-center justify-center"
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
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${theme === id
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

            <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
                <DialogContent className="sm:max-w-md bg-[var(--background)] border-[var(--glass-border)] text-[var(--foreground)]">
                    <DialogHeader>
                        <DialogTitle>Customize Theme</DialogTitle>
                        <DialogDescription className="text-[var(--foreground)] opacity-60">
                            Pick your preferred colors for the custom theme.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bg-color" className="text-right text-[var(--foreground)] opacity-80">
                                Background
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full border border-[var(--glass-border)] overflow-hidden">
                                    <input
                                        id="bg-color"
                                        type="color"
                                        value={customColors.background}
                                        onChange={(e) => handleColorChange('background', e.target.value)}
                                        className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                    />
                                </div>
                                <Input
                                    value={customColors.background}
                                    onChange={(e) => handleColorChange('background', e.target.value)}
                                    className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--foreground)] font-mono"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="text-color" className="text-right text-[var(--foreground)] opacity-80">
                                Text
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full border border-[var(--glass-border)] overflow-hidden">
                                    <input
                                        id="text-color"
                                        type="color"
                                        value={customColors.foreground}
                                        onChange={(e) => handleColorChange('foreground', e.target.value)}
                                        className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                    />
                                </div>
                                <Input
                                    value={customColors.foreground}
                                    onChange={(e) => handleColorChange('foreground', e.target.value)}
                                    className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--foreground)] font-mono"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="accent-color" className="text-right text-[var(--foreground)] opacity-80">
                                Accent
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full border border-[var(--glass-border)] overflow-hidden">
                                    <input
                                        id="accent-color"
                                        type="color"
                                        value={customColors.accent}
                                        onChange={(e) => handleColorChange('accent', e.target.value)}
                                        className="h-full w-full p-0 border-0 cursor-pointer scale-150"
                                    />
                                </div>
                                <Input
                                    value={customColors.accent}
                                    onChange={(e) => handleColorChange('accent', e.target.value)}
                                    className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--foreground)] font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
