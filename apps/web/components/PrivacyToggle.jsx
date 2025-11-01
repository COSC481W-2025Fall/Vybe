'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Globe, Users, Lock, ChevronDown, AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmationDialog - Modal dialog for confirming restrictive privacy changes
 */
function ConfirmationDialog({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  if (!isOpen) return null;

  // Focus management for accessibility
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-white/20 bg-black/95 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-full bg-yellow-500/20 p-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          
          <div className="flex-1">
            <h3 id="confirmation-dialog-title" className="text-lg font-semibold text-white mb-2">
              {title}
            </h3>
            <p id="confirmation-dialog-description" className="text-sm text-gray-300 mb-4">
              {message}
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                ref={cancelButtonRef}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {confirmText}
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PrivacyToggle - Reusable toggle component for boolean privacy settings
 * 
 * @param {string} id - Input ID
 * @param {string} label - Toggle label
 * @param {string} description - Explanation text
 * @param {boolean} checked - Current value
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether toggle is disabled
 * @param {boolean} requireConfirmation - Whether to show confirmation dialog when turning off
 */
export function PrivacyToggle({ 
  id, 
  label, 
  description, 
  checked, 
  onChange, 
  disabled = false,
  requireConfirmation = false,
  confirmationTitle = 'Restrict Privacy Setting?',
  confirmationMessage = 'This will make your information less visible to others. Are you sure you want to continue?',
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValue, setPendingValue] = useState(null);

  const handleToggle = (newValue) => {
    // If turning off (making more restrictive) and confirmation is required
    if (requireConfirmation && checked && !newValue) {
      setPendingValue(newValue);
      setShowConfirmation(true);
    } else {
      onChange(newValue);
    }
  };

  const handleConfirm = () => {
    if (pendingValue !== null) {
      onChange(pendingValue);
      setPendingValue(null);
    }
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setPendingValue(null);
    setShowConfirmation(false);
  };

  // Keyboard navigation support
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(!checked);
    }
  };

  return (
    <>
      <div 
        className="flex items-start justify-between gap-4 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <div className="flex-1">
          <label 
            id={`${id}-label`}
            htmlFor={id} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-sm font-medium text-white">{label}</span>
          </label>
          {description && (
            <p id={`${id}-description`} className="text-xs text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Visual indicator */}
          {checked ? (
            <Eye className="h-4 w-4 text-green-400" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-500" aria-hidden="true" />
          )}
          
          {/* Toggle switch */}
          <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            aria-labelledby={`${id}-label`}
            aria-describedby={description ? `${id}-description` : undefined}
            onClick={() => !disabled && handleToggle(!checked)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black',
              checked ? 'bg-purple-500' : 'bg-gray-600',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                checked ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title={confirmationTitle}
        message={confirmationMessage}
      />
    </>
  );
}

/**
 * PrivacyRadioGroup - Reusable radio group for multi-option privacy settings
 * 
 * @param {string} name - Radio group name
 * @param {string} label - Group label
 * @param {string} description - Explanation text
 * @param {Array} options - Array of {value, label, description, icon}
 * @param {string} value - Current selected value
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether group is disabled
 * @param {boolean} requireConfirmation - Whether to show confirmation for restrictive changes
 */
export function PrivacyRadioGroup({ 
  name, 
  label, 
  description, 
  options = [], 
  value, 
  onChange, 
  disabled = false,
  requireConfirmation = false,
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValue, setPendingValue] = useState(null);

  const IconMap = {
    Globe,
    Users,
    Lock,
    Eye,
    EyeOff,
  };

  // Define privacy level hierarchy (higher = more restrictive)
  const privacyLevels = {
    'public': 0,
    'friends': 1,
    'private': 2,
  };

  const getPrivacyLevel = (val) => {
    return privacyLevels[val] ?? 0;
  };

  const handleChange = (newValue) => {
    const currentLevel = getPrivacyLevel(value);
    const newLevel = getPrivacyLevel(newValue);

    // If making more restrictive and confirmation is required
    if (requireConfirmation && newLevel > currentLevel) {
      const newOption = options.find(opt => opt.value === newValue);
      setPendingValue(newValue);
      setShowConfirmation(true);
    } else {
      onChange(newValue);
    }
  };

  const handleConfirm = () => {
    if (pendingValue !== null) {
      onChange(pendingValue);
      setPendingValue(null);
    }
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setPendingValue(null);
    setShowConfirmation(false);
  };

  const pendingOption = pendingValue ? options.find(opt => opt.value === pendingValue) : null;

  return (
    <>
      <div className="space-y-3" role="radiogroup" aria-labelledby={`${name}-label`} aria-describedby={description ? `${name}-description` : undefined}>
        <div className="mb-4">
          <h3 id={`${name}-label`} className="text-sm font-medium text-white mb-1">
            {label}
          </h3>
          {description && (
            <p id={`${name}-description`} className="text-xs text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          {options.map((option, index) => {
            const Icon = IconMap[option.icon] || Globe;
            const isSelected = value === option.value;
            const optionId = `${name}-${option.value}`;
            
            return (
              <label
                key={option.value}
                htmlFor={optionId}
                className={[
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-black',
                  isSelected
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10',
                  disabled ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => !disabled && handleChange(option.value)}
                  disabled={disabled}
                  className="sr-only"
                  aria-describedby={option.description ? `${optionId}-description` : undefined}
                />
                <div className={[
                  'flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                  isSelected
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-400 bg-transparent',
                ].join(' ')} aria-hidden="true">
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={[
                      'h-4 w-4',
                      isSelected ? 'text-purple-400' : 'text-gray-400',
                    ].join(' ')} aria-hidden="true" />
                    <span className={[
                      'text-sm font-medium',
                      isSelected ? 'text-white' : 'text-gray-300',
                    ].join(' ')}>
                      {option.label}
                    </span>
                  </div>
                  {option.description && (
                    <p id={`${optionId}-description`} className="text-xs text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title="Restrict Privacy Setting?"
        message={
          pendingOption
            ? `You're changing "${label}" to "${pendingOption.label}". This will make your information less visible to others. Are you sure you want to continue?`
            : 'This will make your information less visible to others. Are you sure you want to continue?'
        }
      />
    </>
  );
}

/**
 * PrivacyDropdown - Dropdown/select component for visibility levels
 * 
 * @param {string} id - Input ID
 * @param {string} label - Dropdown label
 * @param {string} description - Explanation text
 * @param {Array} options - Array of {value, label, description, icon}
 * @param {string} value - Current selected value
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether dropdown is disabled
 */
export function PrivacyDropdown({
  id,
  label,
  description,
  options = [],
  value,
  onChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const IconMap = {
    Globe,
    Users,
    Lock,
    Eye,
    EyeOff,
  };

  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const SelectedIcon = selectedOption ? IconMap[selectedOption.icon] || Globe : Globe;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div>
        <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium text-white mb-1">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-xs text-gray-400">
            {description}
          </p>
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          id={id}
          ref={buttonRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${id}-label`}
          aria-describedby={description ? `${id}-description` : undefined}
          className={[
            'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-left transition-all',
            'bg-white/5 border-white/20 text-white',
            'hover:bg-white/10 hover:border-white/30',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption && (
              <>
                <SelectedIcon className="h-4 w-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium truncate">{selectedOption.label}</span>
              </>
            )}
          </div>
          <ChevronDown
            className={[
              'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
              isOpen ? 'transform rotate-180' : '',
            ].join(' ')}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="absolute z-10 w-full mt-2 rounded-lg border border-white/20 bg-black/95 backdrop-blur-sm shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-auto">
              {options.map((option) => {
                const Icon = IconMap[option.icon] || Globe;
                const isSelected = value === option.value;
                const optionId = `${id}-option-${option.value}`;

                return (
                  <button
                    key={option.value}
                    id={optionId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={[
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                      'hover:bg-white/10 focus:bg-white/10',
                      'focus:outline-none focus:ring-1 focus:ring-purple-500',
                      isSelected ? 'bg-purple-500/10' : '',
                    ].join(' ')}
                  >
                    <Icon
                      className={[
                        'h-4 w-4 mt-0.5 flex-shrink-0',
                        isSelected ? 'text-purple-400' : 'text-gray-400',
                      ].join(' ')}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={[
                          'text-sm font-medium',
                          isSelected ? 'text-white' : 'text-gray-300',
                        ].join(' ')}>
                          {option.label}
                        </span>
                        {isSelected && (
                          <span className="text-xs text-purple-400">(Selected)</span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-xs text-gray-400">{option.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
