'use client';

import { memo } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * Confirmation modal for removing a friend
 * Extracted for lazy loading
 */
function RemoveFriendModalComponent({ friend, onConfirm, onCancel }) {
  if (!friend) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="remove-friend-title"
      aria-describedby="remove-friend-description"
    >
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full border border-[var(--glass-border)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
            <Trash2 className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <h3 id="remove-friend-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
            Remove Friend?
          </h3>
        </div>
        
        <p id="remove-friend-description" className="text-sm sm:text-base text-[var(--muted-foreground)] mb-6">
          Are you sure you want to remove{' '}
          <span className="font-semibold text-[var(--foreground)]">
            {friend.name || friend.username}
          </span>{' '}
          as a friend? You&apos;ll need to send a new friend request to reconnect.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 sm:py-3 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export const RemoveFriendModal = memo(RemoveFriendModalComponent);
