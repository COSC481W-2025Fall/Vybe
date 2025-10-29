'use client';

import { Clock } from "lucide-react";

export function GroupCard({ 
  name, 
  description, 
  memberCount, 
  songCount, 
  createdAt,
  onClick 
}) {
  return (
    <div 
      className="glass-card rounded-xl p-6 hover:bg-white/5 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-lg mb-1 truncate">{name}</h3>
          {description && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{songCount || 0} songs</span>
        <span className="px-2.5 py-1 bg-purple-900/40 text-purple-300 text-xs font-medium rounded-full border border-purple-800/50">
          {memberCount || 0} members
        </span>
      </div>
      <div className="flex items-center text-xs text-gray-500 mt-2">
        <Clock className="h-3 w-3 mr-1" />
        <span>{createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
      </div>
    </div>
  );
}
