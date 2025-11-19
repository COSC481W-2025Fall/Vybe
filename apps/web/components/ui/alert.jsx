// TODO: Implement Alert components (Alert, AlertDescription)
// Should support: variant="default" | "destructive", className, children

export function Alert({ variant = "default", className = "", children, ...props }) {
  return (
    <div className={`alert alert-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AlertDescription({ className = "", children, ...props }) {
  return (
    <div className={`alert-description ${className}`} {...props}>
      {children}
    </div>
  );
}

