'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * QueryClient provider for TanStack Query
 * 
 * Wraps the app with QueryClientProvider to enable React Query functionality
 * 
 * Usage:
 * ```jsx
 * <QueryProvider>
 *   {children}
 * </QueryProvider>
 * ```
 */
export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Global error handler for mutations
            onError: (error) => {
              console.error('Mutation error:', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

