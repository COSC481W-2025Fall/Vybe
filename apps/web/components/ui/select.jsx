'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

function Select({ value, onValueChange, children, ...props }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} {...props}>
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectTrigger({ className = '', children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={[
        'w-full px-4 py-3 rounded-lg text-[var(--foreground)] cursor-pointer flex items-center justify-between',
        'bg-[var(--background)] border-2 border-[var(--glass-border)] transition-all',
        '[data-theme="light"]:bg-white [data-theme="light"]:border-black/20',
        'hover:border-[var(--glass-border-hover)] [data-theme="light"]:hover:border-black/40',
        'focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]',
        '[data-theme="light"]:focus:border-black [data-theme="light"]:focus:ring-black/20',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-5 w-5 text-[var(--muted-foreground)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectValue(props) {
  return <SelectPrimitive.Value {...props} />;
}

function SelectContent({ className = '', children, ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={[
          'z-50 rounded-lg text-[var(--foreground)] overflow-hidden shadow-2xl',
          'backdrop-blur-xl border-2 border-[var(--glass-border)]',
          'bg-[var(--dropdown-bg)]',
          '[data-theme="light"]:bg-white [data-theme="light"]:border-black/20',
          className,
        ].join(' ')}
        position="popper"
        sideOffset={4}
        style={{ width: 'var(--radix-select-trigger-width)' }}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1 w-full">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className = '', children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={[
        'relative flex items-center rounded-md py-2.5 px-3 text-sm outline-none select-none',
        'text-[var(--foreground)] cursor-pointer transition-colors',
        'hover:bg-[var(--accent)]/15 focus:bg-[var(--accent)]/15',
        'data-[highlighted]:bg-[var(--accent)]/15',
        '[data-theme="light"]:hover:bg-black/5 [data-theme="light"]:focus:bg-black/5',
        '[data-theme="light"]:data-[highlighted]:bg-black/5',
        className,
      ].join(' ')}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };


