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
          // Base toast - liquid glass style
          toast: `
            group toast 
            group-[.toaster]:border 
            group-[.toaster]:border-white/10 
            group-[.toaster]:[data-theme='light']:border-black/10
            group-[.toaster]:shadow-lg
            group-[.toaster]:backdrop-blur-xl
            group-[.toaster]:saturate-150
          `,
          description: 'group-[.toast]:text-[var(--muted-foreground)]',
          actionButton: 'group-[.toast]:bg-[var(--accent)] group-[.toast]:text-white group-[.toast]:border-0 group-[.toast]:font-medium',
          cancelButton: 'group-[.toast]:bg-white/10 group-[.toast]:text-[var(--foreground)] group-[.toast]:border group-[.toast]:border-white/10',
          // Default/info toast - liquid glass dark
          default: `
            group-[.toaster]:bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_50%,rgba(139,92,246,0.05)_100%)]
            group-[.toaster]:text-[var(--foreground)]
            group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_rgba(255,255,255,0.1)_inset]
          `,
          // Error toast - red tinted liquid glass
          error: `
            group-[.toaster]:bg-[linear-gradient(135deg,rgba(239,68,68,0.15)_0%,rgba(239,68,68,0.08)_50%,rgba(139,92,246,0.05)_100%)]
            group-[.toaster]:text-red-100
            group-[.toaster]:border-red-500/30
            group-[.toaster]:shadow-[0_8px_32px_rgba(239,68,68,0.2),0_0_0_1px_rgba(239,68,68,0.1)_inset]
          `,
          // Success toast - green tinted liquid glass
          success: `
            group-[.toaster]:bg-[linear-gradient(135deg,rgba(34,197,94,0.15)_0%,rgba(34,197,94,0.08)_50%,rgba(139,92,246,0.05)_100%)]
            group-[.toaster]:text-green-100
            group-[.toaster]:border-green-500/30
            group-[.toaster]:shadow-[0_8px_32px_rgba(34,197,94,0.2),0_0_0_1px_rgba(34,197,94,0.1)_inset]
          `,
          // Warning toast - yellow/amber tinted liquid glass
          warning: `
            group-[.toaster]:bg-[linear-gradient(135deg,rgba(245,158,11,0.15)_0%,rgba(245,158,11,0.08)_50%,rgba(139,92,246,0.05)_100%)]
            group-[.toaster]:text-amber-100
            group-[.toaster]:border-amber-500/30
            group-[.toaster]:shadow-[0_8px_32px_rgba(245,158,11,0.2),0_0_0_1px_rgba(245,158,11,0.1)_inset]
          `,
          // Info toast - blue tinted liquid glass
          info: `
            group-[.toaster]:bg-[linear-gradient(135deg,rgba(59,130,246,0.15)_0%,rgba(59,130,246,0.08)_50%,rgba(139,92,246,0.05)_100%)]
            group-[.toaster]:text-blue-100
            group-[.toaster]:border-blue-500/30
            group-[.toaster]:shadow-[0_8px_32px_rgba(59,130,246,0.2),0_0_0_1px_rgba(59,130,246,0.1)_inset]
          `,
        },
        style: {
          // Ensure backdrop filter works
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        },
      }}
      {...props}
    />
  );
}
