'use client';

import * as React from "react";
import { cn } from "./utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles
        "resize-none flex field-sizing-content min-h-16 w-full rounded-lg border-2 px-3 py-2 text-base transition-all outline-none md:text-sm",
        "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        
        // Dark mode - visible borders and background
        "bg-[var(--background)] border-[var(--glass-border)]",
        
        // Light mode - black borders for high contrast
        "[data-theme='light']:bg-white [data-theme='light']:border-black/20",
        
        // Focus states
        "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 focus-visible:border-[var(--accent)]",
        "[data-theme='light']:focus-visible:border-black [data-theme='light']:focus-visible:ring-black/20",
        
        // Invalid states
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
        className,
      )}
      {...props}
    />
  );
}

