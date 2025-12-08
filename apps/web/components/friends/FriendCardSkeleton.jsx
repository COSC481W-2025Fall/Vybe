'use client';

import { memo } from 'react';

/**
 * Skeleton loading component for friend cards
 * Matches the exact layout of FriendCard for smooth transitions
 */
function FriendCardSkeletonComponent() {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5 animate-pulse">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--muted-foreground)]/20 flex-shrink-0" />
        
        {/* Info skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-[var(--muted-foreground)]/20 rounded w-3/4" />
          <div className="h-4 bg-[var(--muted-foreground)]/20 rounded w-1/2" />
          <div className="h-3 bg-[var(--muted-foreground)]/20 rounded w-full mt-1" />
        </div>
        
        {/* Button skeleton */}
        <div className="w-8 h-8 bg-[var(--muted-foreground)]/20 rounded-lg flex-shrink-0" />
      </div>
    </div>
  );
}

export const FriendCardSkeleton = memo(FriendCardSkeletonComponent);

/**
 * Grid of skeleton cards for loading state
 */
export function FriendsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  );
}
