'use client';

import QueryProvider from '@/components/QueryProvider';
import Toast from '@/components/Toast';

/**
 * Client-side providers wrapper
 * 
 * Wraps all client components that need to be in the layout
 */
export default function ClientProviders({ children }) {
  return (
    <QueryProvider>
      {children}
      <Toast />
    </QueryProvider>
  );
}

