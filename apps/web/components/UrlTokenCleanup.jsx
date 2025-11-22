'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * Security component that removes any OAuth tokens from the URL
 * This prevents tokens from being exposed in browser history, logs, or shared URLs
 */
export default function UrlTokenCleanup() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // List of sensitive parameters that should never be in URLs
    const sensitiveParams = [
      'access_token',
      'refresh_token',
      'token',
      'provider_token',
      'provider_refresh_token',
      'code', // OAuth authorization code (should be removed after exchange)
    ];

    // Check if any sensitive parameters are in the URL
    const hasSensitiveParams = sensitiveParams.some(param => searchParams.has(param));

    if (hasSensitiveParams) {
      // Create a new URL without sensitive parameters
      const newSearchParams = new URLSearchParams();
      
      // Copy all non-sensitive parameters
      searchParams.forEach((value, key) => {
        if (!sensitiveParams.includes(key)) {
          newSearchParams.set(key, value);
        }
      });

      // Build the new URL
      const newUrl = pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');

      // Replace the current URL without sensitive parameters (without adding to history)
      if (newUrl !== pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')) {
        console.warn('[UrlTokenCleanup] Removed sensitive parameters from URL');
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [pathname, searchParams, router]);

  return null; // This component doesn't render anything
}

