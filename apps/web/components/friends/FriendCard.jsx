'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';

/**
 * Memoized friend card component
 * Only re-renders when friend data or onRemove changes
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
      className="glass-card rounded-xl p-4 sm:p-5 hover:border-[var(--glass-border-hover)] transition-colors"
      aria-label={`Friend: ${friend.name || friend.username}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Clickable Profile Section */}
        <button
          onClick={handleProfileClick}
          className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          {/* Avatar with next/image optimization */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden relative">
            {friend.profile_picture_url ? (
              <Image
                src={friend.profile_picture_url}
                alt=""
                fill
                sizes="(max-width: 640px) 48px, 56px"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--foreground)] truncate">
              {friend.name || friend.username}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] truncate">
              @{friend.username}
            </p>
            {friend.bio && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2 opacity-80">
                {friend.bio}
              </p>
            )}
          </div>
        </button>

        {/* Remove Button */}
        <button
          onClick={handleRemoveClick}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30 flex-shrink-0"
          aria-label={`Remove ${friend.name || friend.username} as friend`}
        >
          <Trash2 className="h-4 w-4 text-red-400" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export const FriendCard = memo(FriendCardComponent);
