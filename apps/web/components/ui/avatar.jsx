// TODO: Implement Avatar components (Avatar, AvatarImage, AvatarFallback)
// Should support className, src, alt props
// AvatarFallback should show initials or placeholder when image fails

export function Avatar({ className = "", children, ...props }) {
  return (
    <div className={`avatar ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt, className = "", ...props }) {
  return <img src={src} alt={alt} className={`avatar-image ${className}`} {...props} />;
}

export function AvatarFallback({ className = "", children, ...props }) {
  return (
    <div className={`avatar-fallback ${className}`} {...props}>
      {children}
    </div>
  );
}

