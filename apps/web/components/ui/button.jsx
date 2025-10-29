// TODO: Implement Button component
// Should support: size="sm" | "md" | "lg", variant="default" | "outline" | "destructive", className, children
// Reference: shadcn/ui button component

export function Button({ size = "md", variant = "default", className = "", children, ...props }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </button>
  );
}

