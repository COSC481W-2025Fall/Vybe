'use client';

/**
 * UserDataPrefetcher
 * 
 * Invisibly prefetches user data in the background when the user is logged in.
 * This improves perceived performance by loading data before it's needed.
 */

import { useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { prefetchAllUserData } from '@/lib/cache/prefetch';
import { cleanupExpiredCache, getCacheStats } from '@/lib/cache/clientCache';

export default function UserDataPrefetcher() {
  const hasPrefetched = useRef(false);
  
  useEffect(() => {
    // Only run once per session
    if (hasPrefetched.current) return;
    
    const prefetch = async () => {
      try {
        const supabase = createClientComponentClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          hasPrefetched.current = true;
          
          // Log cache stats
          const stats = getCacheStats();
          console.log(`[UserDataPrefetcher] Cache stats: ${stats.entries} entries, ${stats.sizeKB}KB (${stats.usagePercent}% used)`);
          
          // Clean up expired entries first
          cleanupExpiredCache();
          
          // Start prefetching user data
          prefetchAllUserData(supabase, user.id);
        }
      } catch (error) {
        console.error('[UserDataPrefetcher] Error:', error);
      }
    };
    
    // Start prefetch after a short delay to not block initial render
    const timer = setTimeout(prefetch, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Render nothing - this is a utility component
  return null;
}
