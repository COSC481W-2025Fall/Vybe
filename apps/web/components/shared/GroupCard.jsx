'use client';

import { Users, Music, Calendar } from "lucide-react";

export function GroupCard({ 
  name, 
  description, 
  memberCount, 
  songCount, 
  createdAt,
  joinCode,
  visibility = 'Public',
  onClick 
}) {
  return (
    <div 
      className="glass-card rounded-xl p-3 sm:p-4 hover:bg-[var(--secondary-hover)] active:bg-[var(--secondary-hover)] active:scale-[0.98] transition-all cursor-pointer h-[140px] sm:h-[160px] flex flex-col touch-manipulation"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header - fixed height */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)] truncate flex-1">
          {name}
        </h3>
        {visibility && (
          <span className="px-2 py-0.5 bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-full text-xs text-[var(--muted-foreground)] flex-shrink-0">
            {visibility}
          </span>
        )}
      </div>

      {/* Description - flexible, takes remaining space */}
      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 flex-1 min-h-[32px]">
        {description || 'No description'}
      </p>

      {/* Footer - fixed height */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--glass-border)] mt-auto">
        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {memberCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <Music className="w-3 h-3" />
            {songCount || 0}
          </span>
        </div>
        {joinCode ? (
          <span className="px-2 py-0.5 bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded text-xs font-mono text-[var(--muted-foreground)]">
            {joinCode}
          </span>
        ) : createdAt ? (
          <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <Calendar className="w-3 h-3" />
            {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
