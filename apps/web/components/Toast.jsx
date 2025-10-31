'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * Simple toast notification component
 * 
 * Usage:
 * - Listen for 'show-toast' custom events
 * - Displays success/error messages
 * - Auto-dismisses after 3 seconds
 */
export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { type, message } = event.detail;
      const id = Date.now();
      
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'min-w-[300px] rounded-lg border p-4 shadow-lg',
            'flex items-start gap-3',
            'animate-in slide-in-from-right fade-in',
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400',
          ].join(' ')}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

