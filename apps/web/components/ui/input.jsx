'use client';

import * as React from "react";
import { cn } from "./utils";

export function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex h-10 w-full min-w-0 rounded-lg border-2 px-3 py-2 text-base transition-all outline-none md:text-sm",
        "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
        "file:text-[var(--foreground)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        
        // Consistent background and border using CSS variables for all themes
        "bg-[var(--input-bg)] border-[var(--glass-border)]",
        
        // Focus states - uses accent color
        "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 focus-visible:border-[var(--accent)]",
        
        // Invalid states
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
        className,
      )}
      {...props}
    />
  );
}

