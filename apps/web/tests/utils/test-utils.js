// Basic test utilities for React components
import React from 'react';
import { render } from '@testing-library/react';

// Custom render function with providers
export function customRender(ui, options = {}) {
  return render(ui, {
    ...options,
  });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
