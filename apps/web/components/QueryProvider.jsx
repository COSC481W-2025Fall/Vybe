'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { prefetchSettings } from '@/lib/cache/settingsCache';

/**
 * QueryClient provider for TanStack Query
 * 
 * Wraps the app with QueryClientProvider to enable React Query functionality.
 * Includes settings cache optimization and prefetching.
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
            staleTime: 60 * 1000, // 1 minute (default, settings use 5 minutes)
            refetchOnWindowFocus: true, // Refetch on window focus for fresh data
            // Fallback to stale cache if API fails
            placeholderData: (previousData) => previousData,
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

  // Prefetch settings on app load
  useEffect(() => {
    // Prefetch after a short delay to avoid blocking initial render
    const timer = setTimeout(() => {
      prefetchSettings(queryClient).catch((error) => {
        console.warn('[QueryProvider] Failed to prefetch settings:', error);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

