// TODO: Implement Badge component
// Should support: variant="default" | "secondary" | "destructive", className, children

export function Badge({ variant = "default", className = "", children, ...props }) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

