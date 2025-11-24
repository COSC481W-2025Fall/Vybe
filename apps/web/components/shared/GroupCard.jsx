'use client';

import { Clock } from "lucide-react";

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
      className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-white/5 [data-theme='light']:hover:bg-black/5 active:bg-white/5 [data-theme='light']:active:bg-black/5 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] truncate">{name}</h3>
        </div>
        {visibility && (
          <span className="px-2 sm:px-3 py-1 bg-white/5 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 rounded-full text-xs text-[var(--muted-foreground)] ml-2 sm:ml-3 whitespace-nowrap flex-shrink-0">
            {visibility}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mb-3 sm:mb-4 line-clamp-2">
          {description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-[var(--muted-foreground)]">
          <span>{memberCount || 0} members</span>
          <span>{songCount || 0} songs</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Created </span>
            {createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </span>
        </div>
        {joinCode && (
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 rounded-md text-[var(--muted-foreground)] text-xs sm:text-sm font-mono font-semibold self-start sm:self-auto">
            {joinCode}
          </div>
        )}
      </div>
    </div>
  );
}
