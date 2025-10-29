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
        'w-full px-4 py-3 glass-select rounded-xl text-white cursor-pointer flex items-center justify-between',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-5 w-5 text-gray-400" />
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
          'z-50 rounded-xl text-white overflow-hidden shadow-2xl',
          'backdrop-blur-md border',
          'bg-gray-900/90 border-white/15',
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
        'relative flex items-center rounded-md py-2 px-3 text-sm outline-none select-none',
        'text-white hover:bg-white/10 cursor-pointer',
        className,
      ].join(' ')}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };


