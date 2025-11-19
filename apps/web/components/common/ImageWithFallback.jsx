// TODO: Implement ImageWithFallback component
// Should handle image loading errors and show fallback
// Similar to Next.js Image component with error handling

export function ImageWithFallback({ src, alt, fallback, className = "", ...props }) {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={(e) => {
        if (fallback) e.target.src = fallback;
      }}
      {...props} 
    />
  );
}

