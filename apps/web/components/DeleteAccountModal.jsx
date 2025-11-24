'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2, Download, Lock, Info } from 'lucide-react';

const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';

/**
 * DeleteAccountModal - Multi-step confirmation modal for account deletion
 * 
 * Steps:
 * 1. Initial warning with consequences
 * 2. Request reason for deletion (optional feedback)
 * 3. Type confirmation phrase
 * 4. Final confirmation with password re-entry
 */
export default function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form when modal closes
  const handleClose = () => {
    if (!isDeleting) {
      setCurrentStep(1);
      setReason('');
      setConfirmationPhrase('');
      setPassword('');
      setErrors({});
      onClose();
    }
  };

  // Handle step navigation
  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 3) {
      if (confirmationPhrase !== CONFIRMATION_PHRASE) {
        setErrors({ confirmationPhrase: 'Confirmation phrase does not match' });
        return;
      }
      setErrors({});
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1 && !isDeleting) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  // Handle final confirmation
  const handleConfirm = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Call parent's confirmation handler with all data
    onConfirm({
      password,
      reason: reason.trim() || null,
      confirmationPhrase,
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm [data-theme='light']:bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-modal-title"
      onClick={(e) => {
        // Only close if clicking the backdrop (not the modal content)
        if (e.target === e.currentTarget && !isDeleting) {
          handleClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-2xl glass-card rounded-xl border border-red-500/30 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-red-500/30 glass-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 id="delete-account-modal-title" className="text-xl font-semibold text-[var(--foreground)]">
                Delete Your Account
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Step {currentStep} of 4
              </p>
            </div>
          </div>
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Initial Warning */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-red-300 mb-2">
                      This action cannot be undone
                    </h3>
                    <p className="text-sm text-[var(--foreground)]">
                      Deleting your account will permanently remove all of your data from Vybe. 
                      This includes your profile, playlists, listening history, and all social connections.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--foreground)]">What will be deleted:</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-[var(--foreground)] ml-4">
                  <li>Your profile and all associated data</li>
                  <li>All playlists you&apos;ve created</li>
                  <li>Your listening history and activity</li>
                  <li>All social connections and friendships</li>
                  <li>Group playlists and collaborations</li>
                  <li>Your notification preferences and privacy settings</li>
                </ul>
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-300">
                      <strong>Before you continue:</strong> Make sure you&apos;ve exported any data you want to keep. 
                      We recommend downloading your playlists and listening history before deletion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Reason for Deletion (Optional) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                  Why are you deleting your account?
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Your feedback helps us improve. This is optional and can be left blank.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us why you're leaving... (optional)"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none [data-theme='light']:bg-black/5 [data-theme='light']:border-black/20"
                  rows={5}
                  disabled={isDeleting}
                />
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300">
                    Your feedback is anonymous and helps us understand how to make Vybe better.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation Phrase */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                  Type the confirmation phrase
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  To confirm you understand this action cannot be undone, please type:
                </p>
                <div className="rounded-lg border border-white/20 bg-white/5 p-3 mb-4 [data-theme='light']:bg-black/5 [data-theme='light']:border-black/20">
                  <code className="text-lg font-mono font-semibold text-[var(--foreground)]">
                    {CONFIRMATION_PHRASE}
                  </code>
                </div>
                <input
                  type="text"
                  value={confirmationPhrase}
                  onChange={(e) => {
                    setConfirmationPhrase(e.target.value);
                    if (errors.confirmationPhrase) {
                      setErrors({ ...errors, confirmationPhrase: null });
                    }
                  }}
                  placeholder={CONFIRMATION_PHRASE}
                  className={[
                    'w-full px-4 py-3 rounded-lg bg-white/5 border text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2',
                    "[data-theme='light']:bg-black/5 [data-theme='light']:border-black/20",
                    errors.confirmationPhrase
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-white/20 focus:ring-red-500/50 focus:border-red-500/50',
                  ].join(' ')}
                  disabled={isDeleting}
                  autoFocus
                />
                {errors.confirmationPhrase && (
                  <p className="mt-2 text-sm text-red-400">{errors.confirmationPhrase}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Password Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                  Re-enter your password
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  For security, please enter your password to confirm account deletion.
                </p>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors({ ...errors, password: null });
                      }
                    }}
                    placeholder="Enter your password"
                    className={[
                      'w-full px-4 py-3 pl-12 rounded-lg bg-white/5 border text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2',
                      "[data-theme='light']:bg-black/5 [data-theme='light']:border-black/20",
                      errors.password
                        ? 'border-red-500/50 focus:ring-red-500/50'
                        : 'border-white/20 focus:ring-red-500/50 focus:border-red-500/50',
                    ].join(' ')}
                    disabled={isDeleting}
                    autoFocus
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-300 mb-1">
                      Final Warning
                    </p>
                    <p className="text-xs text-[var(--foreground)]">
                      Once you confirm, your account and all associated data will be permanently deleted. 
                      This cannot be undone or recovered.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 pt-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={[
                  'h-2 w-2 rounded-full transition-all',
                  step === currentStep
                    ? 'bg-red-400 w-8'
                    : step < currentStep
                    ? 'bg-red-600'
                    : 'bg-gray-600',
                ].join(' ')}
                aria-label={step === currentStep ? `Current step: ${step}` : `Step ${step}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-4 p-6 border-t border-red-500/30 glass-card">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || isDeleting}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              "border border-white/20 text-[var(--muted-foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)]",
              "[data-theme='light']:border-black/20",
              (currentStep === 1 || isDeleting) && 'opacity-50 cursor-not-allowed',
            ].join(' ')}
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {!isDeleting && (
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all border border-white/20 text-[var(--muted-foreground)] hover:bg-white/5 [data-theme='light']:hover:bg-black/5 hover:text-[var(--foreground)] [data-theme='light']:border-black/20"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={isDeleting}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={isDeleting || !password}
                className={[
                  'px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Account Permanently
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

