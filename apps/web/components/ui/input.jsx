'use client';

import * as React from "react";
import { cn } from "./utils";

export function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] selection:bg-primary selection:text-primary-foreground backdrop-blur-[60px] saturate-[180%] flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow,background] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-[var(--foreground)]",
        "bg-white/15 border-white/12",
        "[data-theme='light']:bg-black/10 [data-theme='light']:border-black/30",
        "focus-visible:ring-[3px] focus-visible:border-primary/30 focus-visible:ring-primary/10 focus-visible:bg-white/25 focus-visible:border-white/25 focus-visible:ring-white/10",
        "[data-theme='light']:focus-visible:bg-black/15 [data-theme='light']:focus-visible:border-black/40 [data-theme='light']:focus-visible:ring-black/10",
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
        className,
      )}
      {...props}
    />
  );
}

