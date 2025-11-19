'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";

export function GlassCard({ 
  children, 
  title, 
  description, 
  className = "", 
  onClick,
  hover = false 
}) {
  const hoverClass = hover ? "hover:bg-accent/50 transition-colors cursor-pointer" : "";
  
  return (
    <Card 
      className={`glass-card ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {children && <CardContent className={title || description ? "" : "p-4"}>{children}</CardContent>}
      {!children && !title && !description && <CardContent className="p-4" />}
    </Card>
  );
}

