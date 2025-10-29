// TODO: Implement useDialog hook
// Should return: { isOpen, open, close, setIsOpen }
// Simple state management for dialog open/close

import { useState } from 'react';

export function useDialog(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    setIsOpen
  };
}

