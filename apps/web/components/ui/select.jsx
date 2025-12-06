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
        'bg-[var(--input-bg)] border-2 border-[var(--glass-border)] transition-all',
        'hover:border-[var(--glass-border-hover)]',
        'focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]',
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
          'z-[100] rounded-lg text-[var(--foreground)] overflow-hidden shadow-2xl',
          'backdrop-blur-xl border-2 border-[var(--glass-border)]',
          'bg-[var(--dropdown-bg)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        ].join(' ')}
        position="popper"
        sideOffset={4}
        style={{ width: 'var(--radix-select-trigger-width)' }}
        onCloseAutoFocus={(e) => e.preventDefault()}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1 w-full max-h-[300px] overflow-y-auto">
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
        'hover:bg-[var(--secondary-hover)] focus:bg-[var(--secondary-hover)]',
        'data-[highlighted]:bg-[var(--secondary-hover)]',
        className,
      ].join(' ')}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };


