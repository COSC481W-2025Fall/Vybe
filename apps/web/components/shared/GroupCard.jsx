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
      className="glass-card rounded-2xl p-6 hover:bg-white/5 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{name}</h3>
        </div>
        {visibility && (
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 ml-3 whitespace-nowrap">
            {visibility}
          </span>
        )}
      </div>

      {description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <span>{memberCount || 0} members</span>
          <span>{songCount || 0} songs</span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Created {createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </span>
        </div>
        {joinCode && (
          <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-gray-300 text-sm font-mono font-semibold">
            {joinCode}
          </div>
        )}
      </div>
    </div>
  );
}
