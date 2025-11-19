'use client';

import { GlassCard } from "./GlassCard";

export function LoadingState({ count = 3, className = "" }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <GlassCard key={i} className={className}>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </GlassCard>
      ))}
    </>
  );
}
