'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';

// Fixed card height to prevent CLS - MUST match FriendCardSkeleton
const CARD_MIN_HEIGHT = 'min-h-[88px] sm:min-h-[96px]';

/**
 * Memoized friend card component
 * Only re-renders when friend data or onRemove changes
 * Uses fixed dimensions to prevent CLS
 */
function FriendCardComponent({ friend, onRemove }) {
  const router = useRouter();
  
  const handleProfileClick = useCallback(() => {
    router.push(`/u/${friend.username}`);
  }, [router, friend.username]);
  
  const handleRemoveClick = useCallback((e) => {
    e.stopPropagation();
    onRemove(friend);
  }, [onRemove, friend]);

  const initials = friend.name?.charAt(0)?.toUpperCase() || 
                   friend.username?.charAt(0)?.toUpperCase() || '?';

  return (
    <article
      className={`glass-card rounded-xl p-4 sm:p-5 hover:border-[var(--glass-border-hover)] transition-colors ${CARD_MIN_HEIGHT}`}
      aria-label={`Friend: ${friend.name || friend.username}`}
      style={{ contain: 'layout' }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Clickable Profile Section */}
        <button
          onClick={handleProfileClick}
          className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          {/* Avatar with explicit dimensions to prevent CLS */}
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden relative"
            style={{ aspectRatio: '1/1' }}
          >
            {friend.profile_picture_url ? (
              <Image
                src={friend.profile_picture_url}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
                loading="lazy"
                placeholder="empty"
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>

          {/* Info - fixed line heights */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--foreground)] truncate leading-5 h-5">
              {friend.name || friend.username}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] truncate leading-4 h-4">
              @{friend.username}
            </p>
            {/* Bio area - always reserve space even if empty to prevent CLS */}
            <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2 opacity-80 min-h-[16px]">
              {friend.bio || '\u00A0'}
            </p>
          </div>
        </button>

        {/* Remove Button - fixed size */}
        <button
          onClick={handleRemoveClick}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30 flex-shrink-0"
          aria-label={`Remove ${friend.name || friend.username} as friend`}
        >
          <Trash2 className="h-4 w-4 text-red-400" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export const FriendCard = memo(FriendCardComponent);
