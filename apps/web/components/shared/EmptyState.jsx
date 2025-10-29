'use client';

import { GlassCard } from "./GlassCard";

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = "" 
}) {
  return (
    <GlassCard className={`col-span-full ${className}`}>
      <div className="p-8 text-center">
        {Icon && <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
        <h3 className="mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {action}
      </div>
    </GlassCard>
  );
}
