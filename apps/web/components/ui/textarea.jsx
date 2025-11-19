'use client';

import * as React from "react";
import { cn } from "./utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none placeholder:text-gray-400 focus-visible:ring-primary/50 aria-invalid:ring-red-500/20 aria-invalid:border-red-500 flex field-sizing-content min-h-16 w-full rounded-md border border-white/12 bg-white/10 backdrop-blur-[60px] px-3 py-2 text-base text-white transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:border-white/25 focus-visible:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

