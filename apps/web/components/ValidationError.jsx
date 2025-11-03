'use client';

import { AlertCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * ValidationError Component
 * 
 * Reusable component for displaying validation errors with:
 * - Error messages below input fields
 * - Red styling with warning icon
 * - Animation on error appearance
 * - Accessibility (ARIA live region)
 * - Support for multiple errors per field
 * - Clear, user-friendly error messages
 * 
 * @param {Object} props
 * @param {string|string[]|Object} props.error - Error message(s) or error object
 * @param {string} props.fieldName - Field name for accessibility
 * @param {boolean} props.showIcon - Whether to show the warning icon (default: true)
 * @param {boolean} props.animate - Whether to animate error appearance (default: true)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.inline - Whether to display inline (default: false)
 */
export default function ValidationError({
  error,
  fieldName,
  showIcon = true,
  animate = true,
  className = '',
  inline = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const prevErrorRef = useRef(error);
  const announceRef = useRef(null);

  // Track error changes for animation
  useEffect(() => {
    const hasErrorNow = Boolean(error);
    const hadErrorBefore = Boolean(prevErrorRef.current);

    if (hasErrorNow && !hadErrorBefore) {
      // Error just appeared
      setIsVisible(true);
      setHasError(true);
      
      // Announce error to screen readers
      if (announceRef.current) {
        announceRef.current.textContent = getErrorMessage(error);
      }
    } else if (!hasErrorNow && hadErrorBefore) {
      // Error just disappeared
      setIsVisible(false);
      setTimeout(() => setHasError(false), 200); // Wait for fade-out
    } else if (hasErrorNow) {
      // Error still exists, update message
      setHasError(true);
      if (announceRef.current) {
        announceRef.current.textContent = getErrorMessage(error);
      }
    }

    prevErrorRef.current = error;
  }, [error]);

  // Helper function to extract error message
  const getErrorMessage = (error) => {
    if (!error) return null;
    
    // Handle different error formats
    if (typeof error === 'string') {
      return error;
    }
    
    if (Array.isArray(error)) {
      return error.join(', ');
    }
    
    if (typeof error === 'object') {
      // React Hook Form error format: { message: string, type: string }
      if (error.message) {
        return error.message;
      }
      
      // Multiple errors: { field1: 'error1', field2: 'error2' }
      const messages = Object.values(error).filter(Boolean);
      return messages.length > 0 ? messages.join(', ') : null;
    }
    
    return null;
  };

  // Helper function to get all error messages
  const getErrorMessages = (error) => {
    if (!error) return [];
    
    if (typeof error === 'string') {
      return [error];
    }
    
    if (Array.isArray(error)) {
      return error;
    }
    
    if (typeof error === 'object') {
      if (error.message) {
        return [error.message];
      }
      
      // Multiple errors
      return Object.values(error).filter(Boolean);
    }
    
    return [];
  };

  const messages = getErrorMessages(error);

  if (!hasError || messages.length === 0) {
    return null;
  }

  // Inline display (for helper text replacement)
  if (inline) {
    return (
      <>
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className={[
            'flex items-start gap-2',
            animate && isVisible
              ? 'opacity-100 translate-y-0 transition-all duration-200 ease-out'
              : '',
            className,
          ].filter(Boolean).join(' ')}
        >
          {showIcon && (
            <AlertCircle 
              className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" 
              aria-hidden="true"
            />
          )}
          <div className="flex-1">
            {messages.map((message, index) => (
              <div
                key={index}
                className={[
                  'text-xs text-red-400',
                  index > 0 && 'mt-1',
                ].filter(Boolean).join(' ')}
              >
                {message}
              </div>
            ))}
          </div>
        </div>
        {/* Screen reader announcement */}
        <div
          ref={announceRef}
          className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
          aria-live="polite"
          aria-atomic="true"
          role="status"
        />
      </>
    );
  }

  // Block display (below input field)
  return (
    <>
      <div
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        className={[
          'mt-1 flex items-start gap-2',
          animate && isVisible
            ? 'opacity-100 translate-y-0 transition-all duration-200 ease-out'
            : animate
            ? 'opacity-0 -translate-y-1 transition-all duration-200 ease-in'
            : '',
          className,
        ].filter(Boolean).join(' ')}
        aria-label={fieldName ? `${fieldName} validation error` : 'Validation error'}
      >
        {showIcon && (
          <AlertCircle 
            className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" 
            aria-hidden="true"
          />
        )}
        <div className="flex-1 space-y-1">
          {messages.map((message, index) => (
            <div
              key={index}
              className={[
                'text-sm text-red-400',
                index > 0 && 'text-xs',
              ].filter(Boolean).join(' ')}
            >
              {message}
            </div>
          ))}
        </div>
      </div>
      {/* Screen reader announcement */}
      <div
        ref={announceRef}
        className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />
    </>
  );
}

/**
 * FieldError Helper Component
 * 
 * Simplified wrapper for common use case: displaying single error below input
 * 
 * @param {Object} props
 * @param {string|Object} props.error - Error message or error object
 * @param {string} props.fieldName - Field name
 * @param {string} props.className - Additional CSS classes
 */
export function FieldError({ error, fieldName, className = '' }) {
  return (
    <ValidationError
      error={error}
      fieldName={fieldName}
      showIcon={true}
      animate={true}
      inline={false}
      className={className}
    />
  );
}

/**
 * InlineError Helper Component
 * 
 * For displaying errors inline with helper text (replaces helper text when error exists)
 * 
 * @param {Object} props
 * @param {string|Object} props.error - Error message or error object
 * @param {ReactNode} props.children - Helper text to show when no error
 * @param {string} props.fieldName - Field name
 * @param {string} props.className - Additional CSS classes
 */
export function InlineError({ error, children, fieldName, className = '' }) {
  if (error) {
    return (
      <ValidationError
        error={error}
        fieldName={fieldName}
        showIcon={true}
        animate={true}
        inline={true}
        className={className}
      />
    );
  }

  return <div className={className}>{children}</div>;
}

/**
 * ValidationSummary Component
 * 
 * Displays all validation errors for a form in a summary box
 * 
 * @param {Object} props
 * @param {Object} props.errors - Object with field names as keys and errors as values
 * @param {string} props.title - Summary title (default: "Please fix the following errors")
 * @param {string} props.className - Additional CSS classes
 */
export function ValidationSummary({ errors, title, className = '' }) {
  const errorEntries = Object.entries(errors || {}).filter(([_, error]) => Boolean(error));

  if (errorEntries.length === 0) {
    return null;
  }

  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'Validation error';
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={[
        'mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4',
        'opacity-100 translate-y-0 transition-all duration-300 ease-out',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-400 mb-2">
            {title || 'Please fix the following errors'}
          </h3>
          <ul className="space-y-1">
            {errorEntries.map(([field, error]) => (
              <li key={field} className="text-sm text-red-300">
                <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>{' '}
                {getErrorMessage(error)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

