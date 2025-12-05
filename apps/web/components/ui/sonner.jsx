'use client';

import { Toaster as Sonner } from "sonner";

export function Toaster({ ...props }) {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      expand={true}
      richColors
      closeButton
      duration={5000}
      gap={8}
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-[var(--dropdown-bg)] group-[.toaster]:text-[var(--foreground)] group-[.toaster]:border-[var(--glass-border)] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[var(--muted-foreground)]',
          actionButton: 'group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[var(--background)]',
          cancelButton: 'group-[.toast]:bg-[var(--secondary-bg)] group-[.toast]:text-[var(--foreground)]',
          error: 'group-[.toaster]:bg-red-900/90 group-[.toaster]:text-red-100 group-[.toaster]:border-red-500/50',
          success: 'group-[.toaster]:bg-green-900/90 group-[.toaster]:text-green-100 group-[.toaster]:border-green-500/50',
          warning: 'group-[.toaster]:bg-yellow-900/90 group-[.toaster]:text-yellow-100 group-[.toaster]:border-yellow-500/50',
          info: 'group-[.toaster]:bg-blue-900/90 group-[.toaster]:text-blue-100 group-[.toaster]:border-blue-500/50',
        },
      }}
      {...props}
    />
  );
}

