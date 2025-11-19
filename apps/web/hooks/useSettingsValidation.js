'use client';

import { useCallback, useMemo } from 'react';
import { profileSchema, privacySchema, notificationSchema } from '@/lib/schemas';

/**
 * Settings Validation Hook
 * 
 * Provides client-side validation utilities for settings forms.
 * Features:
 * - Real-time validation as user types
 * - Field-specific validation
 * - Custom error messages
 * - Validation state management
 * 
 * @param {string} type - Settings type: 'profile', 'privacy', or 'notifications'
 * @returns {Object} Validation utilities and state
 */
export function useSettingsValidation(type) {
  // Get the appropriate schema
  const schema = useMemo(() => {
    switch (type) {
      case 'profile':
        return profileSchema;
      case 'privacy':
        return privacySchema;
      case 'notifications':
        return notificationSchema;
      default:
        return null;
    }
  }, [type]);

  /**
   * Validate entire form data
   * @param {Object} data - Form data to validate
   * @returns {Object} Validation result
   */
  const validate = useCallback((data) => {
    if (!schema) {
      return {
        success: false,
        error: 'Invalid validation type',
        errors: {},
      };
    }

    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        errors: {},
      };
    }

    // Transform Zod errors into a flat object keyed by field name
    const errors = {};
    result.error.errors.forEach((error) => {
      const path = error.path.join('.');
      errors[path] = error.message;
    });

    return {
      success: false,
      error: 'Validation failed',
      errors,
      zodError: result.error,
    };
  }, [schema]);

  /**
   * Validate a single field
   * @param {string} field - Field name to validate
   * @param {any} value - Field value
   * @returns {Object} Field validation result
   */
  const validateField = useCallback((field, value) => {
    if (!schema) {
      return {
        success: false,
        error: 'Invalid validation type',
      };
    }

    const fieldSchema = schema.shape[field];
    if (!fieldSchema) {
      return {
        success: false,
        error: `Unknown field: ${field}`,
      };
    }

    const result = fieldSchema.safeParse(value);

    return {
      success: result.success,
      error: result.success ? null : result.error.errors[0]?.message || 'Invalid value',
      field,
    };
  }, [schema]);

  /**
   * Validate multiple fields at once
   * @param {Object} fields - Object with field names as keys and values as values
   * @returns {Object} Validation results for each field
   */
  const validateFields = useCallback((fields) => {
    if (!schema) {
      return {
        success: false,
        errors: {},
      };
    }

    const errors = {};
    let allValid = true;

    Object.entries(fields).forEach(([field, value]) => {
      const fieldResult = validateField(field, value);
      if (!fieldResult.success) {
        errors[field] = fieldResult.error;
        allValid = false;
      }
    });

    return {
      success: allValid,
      errors,
    };
  }, [schema, validateField]);

  /**
   * Check if data would be valid without actually parsing
   * (lightweight check)
   * @param {Object} data - Data to check
   * @returns {boolean} True if data appears valid
   */
  const isValid = useCallback((data) => {
    if (!schema) return false;
    return schema.safeParse(data).success;
  }, [schema]);

  /**
   * Get validation rules for a specific field
   * @param {string} field - Field name
   * @returns {Object|null} Field validation rules
   */
  const getFieldRules = useCallback((field) => {
    if (!schema) return null;

    const fieldSchema = schema.shape[field];
    if (!fieldSchema) return null;

    const rules = {
      field,
      required: false,
      min: null,
      max: null,
      pattern: null,
      type: null,
    };

    // Extract rules from schema (best effort)
    // Zod schemas are complex, so we extract what we can
    if (fieldSchema._def?.typeName === 'ZodString') {
      rules.type = 'string';
      
      // Check for min length
      if (fieldSchema._def.checks) {
        fieldSchema._def.checks.forEach((check) => {
          if (check.kind === 'min') {
            rules.min = check.value;
            rules.required = true; // If there's a min, field is likely required
          }
          if (check.kind === 'max') {
            rules.max = check.value;
          }
          if (check.kind === 'regex') {
            rules.pattern = check.regex;
          }
        });
      }
    } else if (fieldSchema._def?.typeName === 'ZodBoolean') {
      rules.type = 'boolean';
      rules.required = true; // Booleans are typically required
    } else if (fieldSchema._def?.typeName === 'ZodEnum') {
      rules.type = 'enum';
      rules.enum = fieldSchema._def.values;
      rules.required = true;
    }

    return rules;
  }, [schema]);

  /**
   * Get all validation errors for form data
   * Returns errors in a format compatible with React Hook Form
   * @param {Object} data - Form data
   * @returns {Object} Errors object keyed by field name
   */
  const getErrors = useCallback((data) => {
    const result = validate(data);
    return result.errors || {};
  }, [validate]);

  /**
   * Get error message for a specific field
   * @param {Object} errors - Errors object from getErrors
   * @param {string} field - Field name
   * @returns {string|null} Error message or null
   */
  const getFieldError = useCallback((errors, field) => {
    if (!errors || !errors[field]) return null;
    return errors[field];
  }, []);

  /**
   * Check if form has any errors
   * @param {Object} errors - Errors object
   * @returns {boolean} True if form has errors
   */
  const hasErrors = useCallback((errors) => {
    if (!errors) return false;
    return Object.keys(errors).length > 0;
  }, []);

  return {
    // Validation functions
    validate,
    validateField,
    validateFields,
    isValid,
    
    // Field information
    getFieldRules,
    
    // Error utilities
    getErrors,
    getFieldError,
    hasErrors,
    
    // Schema reference
    schema,
  };
}


