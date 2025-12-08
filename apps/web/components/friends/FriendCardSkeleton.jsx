'use client';

import { memo } from 'react';

// Fixed card height to prevent CLS - matches FriendCard exactly
const CARD_MIN_HEIGHT = 'min-h-[88px] sm:min-h-[96px]';

/**
 * Skeleton loading component for friend cards
 * MUST match the exact layout and dimensions of FriendCard to prevent CLS
 */
function FriendCardSkeletonComponent() {
  return (
    <div className={`glass-card rounded-xl p-4 sm:p-5 ${CARD_MIN_HEIGHT}`}>
      <div className="flex items-start gap-3 sm:gap-4 animate-pulse">
        {/* Avatar skeleton - exact size match */}
        <div 
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--muted-foreground)]/20 flex-shrink-0"
          style={{ aspectRatio: '1/1' }}
        />
        
        {/* Info skeleton - matches text layout */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-[var(--muted-foreground)]/20 rounded w-3/4 max-w-[150px]" />
          <div className="h-4 bg-[var(--muted-foreground)]/20 rounded w-1/2 max-w-[100px]" />
          <div className="h-3 bg-[var(--muted-foreground)]/20 rounded w-full" />
        </div>
        
        {/* Button skeleton - exact size */}
        <div className="w-8 h-8 bg-[var(--muted-foreground)]/20 rounded-lg flex-shrink-0" />
      </div>
    </div>
  );
}

export const FriendCardSkeleton = memo(FriendCardSkeletonComponent);

/**
 * Grid of skeleton cards for loading state
 * Uses contain: content for layout isolation
 */
export function FriendsGridSkeleton({ count = 6 }) {
  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      style={{ contain: 'layout' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Export the height constant for use in FriendCard
export { CARD_MIN_HEIGHT };
