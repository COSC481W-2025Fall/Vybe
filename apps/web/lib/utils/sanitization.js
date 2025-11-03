/**
 * Input Sanitization Utilities
 * 
 * Utility functions for sanitizing user inputs to prevent XSS attacks,
 * handle unicode properly, and normalize text data.
 * 
 * Features:
 * - Strip HTML tags from text inputs
 * - Remove dangerous characters
 * - Normalize whitespace
 * - Trim leading/trailing spaces
 * - Escape special characters where needed
 * - Handle unicode characters properly
 * - Apply to all user-generated content
 */

/**
 * Strip HTML tags from a string
 * Removes all HTML/XML tags while preserving text content
 * 
 * @param {string} input - String to sanitize
 * @returns {string} Text with HTML tags removed
 */
export function stripHtmlTags(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove HTML tags using regex (applied repeatedly in case of nested/malformed tags)
  // This regex matches < followed by any characters until >
  // The non-greedy ? ensures we match the shortest possible tag
  let output = input;
  let previous;
  do {
    previous = output;
    output = output.replace(/<[^>]*>/g, '');
  } while (output !== previous);
  return output;
}

/**
 * Remove dangerous characters from a string
 * Removes characters that could be used for XSS or injection attacks
 * 
 * @param {string} input - String to sanitize
 * @returns {string} String with dangerous characters removed
 */
export function removeDangerousChars(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  let output = input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onload=, etc.)
    .replace(/data:/gi, '') // Remove data: protocol (can be dangerous)
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/import\s+/gi, '') // Remove import statements
    .replace(/@import/gi, '') // Remove CSS @import
    .replace(/url\s*\(/gi, '') // Remove url() in CSS
    .replace(/<script/gi, '') // Remove script tag starts (in case some escaped)
    .replace(/<\/script>/gi, ''); // Remove script tag ends

  // Remove dangerous function calls (including arguments)
  // This pattern matches: functionName(anything up to matching closing paren)
  const dangerousFunctions = ['alert', 'eval', 'confirm', 'prompt'];
  for (const func of dangerousFunctions) {
    // Match function calls: func(anything including nested parens)
    const regex = new RegExp(`\\b${func}\\s*\\([^)]*\\)`, 'gi');
    output = output.replace(regex, '');
    // Also handle cases where paren might be on next line or have nested calls
    // Simpler: remove remaining fragments like ") " or ")Hello"
    output = output.replace(new RegExp(`\\b${func}\\s*\\(`, 'gi'), '');
  }

  // Remove dangerous document/window methods
  output = output
    .replace(/document\.(write|writeln|cookie)/gi, '')
    .replace(/window\.(location|document)/gi, '')
    .replace(/\.innerHTML/gi, '');

  return output;
}

/**
 * Normalize whitespace in a string
 * Converts multiple spaces, tabs, newlines to single spaces
 * 
 * @param {string} input - String to normalize
 * @returns {string} String with normalized whitespace
 */
export function normalizeWhitespace(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
    .replace(/[\t\r]/g, ' '); // Replace tabs and carriage returns with spaces
}

/**
 * Trim leading and trailing whitespace
 * 
 * @param {string} input - String to trim
 * @returns {string} Trimmed string
 */
export function trimWhitespace(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input.trim();
}

/**
 * Escape HTML special characters
 * Converts characters that have special meaning in HTML to their entities
 * 
 * @param {string} input - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Unescape HTML entities
 * Converts HTML entities back to their characters
 * 
 * @param {string} input - String to unescape
 * @returns {string} Unescaped string
 */
export function unescapeHtml(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  const htmlUnescapes = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#39;': "'",
    '&#x2F;': '/',
    '&#47;': '/',
  };

  return input.replace(/&(amp|lt|gt|quot|#x27|#39|#x2F|#47);/g, (match) => {
    return htmlUnescapes[match] || match;
  });
}

/**
 * Normalize unicode characters
 * Handles unicode normalization and removes problematic characters
 * 
 * @param {string} input - String to normalize
 * @param {string} form - Unicode normalization form (NFC, NFD, NFKC, NFKD)
 * @returns {string} Unicode-normalized string
 */
export function normalizeUnicode(input, form = 'NFC') {
  if (typeof input !== 'string') {
    return String(input);
  }

  try {
    // Normalize unicode (NFC is the most common form)
    // NFC: Canonical Decomposition, followed by Canonical Composition
    let normalized = input.normalize(form);

    // Remove zero-width characters that could be used for homograph attacks
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Remove other invisible/control characters (but keep newlines)
    normalized = normalized.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

    return normalized;
  } catch (error) {
    // If normalization fails, return original string
    console.warn('[sanitization] Unicode normalization failed:', error);
    return input;
  }
}

/**
 * Sanitize text input (general purpose)
 * Applies all sanitization steps for general text input
 * 
 * @param {string} input - String to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} options.stripHtml - Strip HTML tags (default: true)
 * @param {boolean} options.removeDangerous - Remove dangerous chars (default: true)
 * @param {boolean} options.normalizeWhitespace - Normalize whitespace (default: true)
 * @param {boolean} options.trim - Trim whitespace (default: true)
 * @param {boolean} options.escapeHtml - Escape HTML (default: false, usually not needed if stripping)
 * @param {boolean} options.normalizeUnicode - Normalize unicode (default: true)
 * @returns {string} Sanitized string
 */
export function sanitizeText(input, options = {}) {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    input = String(input);
  }

  const {
    stripHtml = true,
    removeDangerous = true,
    normalizeWhitespace: normalizeWS = true,
    trim = true,
    escapeHtml: escape = false,
    normalizeUnicode: normalizeUni = true,
  } = options;

  let sanitized = input;

  // Normalize unicode first (before other operations)
  if (normalizeUni) {
    sanitized = normalizeUnicode(sanitized);
  }

  // Strip HTML tags
  if (stripHtml) {
    sanitized = stripHtmlTags(sanitized);
  }

  // Remove dangerous characters
  if (removeDangerous) {
    sanitized = removeDangerousChars(sanitized);
  }

  // Normalize whitespace
  if (normalizeWS) {
    sanitized = normalizeWhitespace(sanitized);
  }

  // Trim whitespace
  if (trim) {
    sanitized = trimWhitespace(sanitized);
  }

  // Escape HTML (usually not needed if we're stripping HTML)
  // This is useful if you want to preserve HTML but escape it
  if (escape) {
    sanitized = escapeHtml(sanitized);
  }

  return sanitized;
}

/**
 * Sanitize display name
 * Applies sanitization appropriate for display names
 * 
 * @param {string} input - Display name to sanitize
 * @returns {string} Sanitized display name
 */
export function sanitizeDisplayName(input) {
  return sanitizeText(input, {
    stripHtml: true,
    removeDangerous: true,
    normalizeWhitespace: true,
    trim: true,
    escapeHtml: false,
    normalizeUnicode: true,
  });
}

/**
 * Sanitize bio/description text
 * Allows newlines and preserves some formatting
 * 
 * @param {string} input - Bio text to sanitize
 * @returns {string} Sanitized bio text
 */
export function sanitizeBio(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  // Normalize unicode
  let sanitized = normalizeUnicode(input);

  // Strip HTML but preserve newlines
  sanitized = stripHtmlTags(sanitized);

  // Remove dangerous characters
  sanitized = removeDangerousChars(sanitized);

  // Normalize whitespace but preserve newlines
  sanitized = sanitized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs -> single space
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // More than 2 newlines -> 2 newlines

  // Trim
  sanitized = trimWhitespace(sanitized);

  return sanitized;
}

/**
 * Sanitize username
 * More strict sanitization for usernames
 * 
 * @param {string} input - Username to sanitize
 * @returns {string} Sanitized username
 */
export function sanitizeUsername(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  // Normalize unicode
  let sanitized = normalizeUnicode(input);

  // Strip HTML
  sanitized = stripHtmlTags(sanitized);

  // Remove dangerous characters
  sanitized = removeDangerousChars(sanitized);

  // Remove special characters that shouldn't be in usernames
  // Keep: letters, numbers, underscores, hyphens, dots
  sanitized = sanitized.replace(/[^a-zA-Z0-9_.-]/g, '');

  // Normalize whitespace (remove all)
  sanitized = sanitized.replace(/\s+/g, '');

  // Trim
  sanitized = trimWhitespace(sanitized);

  return sanitized;
}

/**
 * Sanitize URL input
 * Validates and sanitizes URL strings
 * 
 * @param {string} input - URL to sanitize
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(input) {
  if (typeof input !== 'string' || !input.trim()) {
    return null;
  }

  let sanitized = trimWhitespace(input);

  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerInput = sanitized.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerInput.startsWith(protocol)) {
      return null;
    }
  }

  // Only allow http, https, and relative URLs
  // Relative URLs start with / or ./
  const isRelative = sanitized.startsWith('/') || sanitized.startsWith('./');
  const isHttp = sanitized.match(/^https?:\/\//i);

  if (!isRelative && !isHttp) {
    return null;
  }

  // Validate URL format (if not relative)
  if (!isRelative) {
    try {
      const url = new URL(sanitized);
      // Only allow http and https
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  return sanitized;
}

/**
 * Sanitize object recursively
 * Applies sanitization to all string values in an object
 * 
 * @param {any} input - Object or value to sanitize
 * @param {Object} options - Sanitization options
 * @param {Function} options.sanitizer - Custom sanitizer function per field type
 * @returns {any} Sanitized object
 */
export function sanitizeObject(input, options = {}) {
  const { sanitizer = sanitizeText } = options;

  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizer(input, options);
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeObject(item, options));
  }

  if (typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize key as well
      const sanitizedKey = sanitizeText(String(key), {
        stripHtml: true,
        removeDangerous: true,
        normalizeWhitespace: false,
        trim: true,
      });
      
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    }
    return sanitized;
  }

  return input;
}

/**
 * Sanitize form data
 * Applies appropriate sanitization based on field type
 * 
 * @param {Object} formData - Form data object
 * @param {Object} fieldConfig - Configuration for each field's sanitization
 * @returns {Object} Sanitized form data
 */
export function sanitizeFormData(formData, fieldConfig = {}) {
  const sanitized = {};

  for (const [field, value] of Object.entries(formData)) {
    const config = fieldConfig[field];

    if (config?.type === 'display_name') {
      sanitized[field] = sanitizeDisplayName(value);
    } else if (config?.type === 'bio') {
      sanitized[field] = sanitizeBio(value);
    } else if (config?.type === 'username') {
      sanitized[field] = sanitizeUsername(value);
    } else if (config?.type === 'url') {
      sanitized[field] = sanitizeUrl(value);
    } else if (config?.sanitizer) {
      sanitized[field] = config.sanitizer(value);
    } else {
      // Default sanitization
      sanitized[field] = sanitizeText(value);
    }
  }

  return sanitized;
}

/**
 * Check if a string contains potentially dangerous content
 * 
 * @param {string} input - String to check
 * @returns {Object} { isSafe: boolean, warnings: string[] }
 */
export function checkDangerousContent(input) {
  if (typeof input !== 'string') {
    return { isSafe: true, warnings: [] };
  }

  const warnings = [];

  // Check for HTML tags
  if (/<[^>]*>/g.test(input)) {
    warnings.push('Contains HTML tags');
  }

  // Check for script tags
  if (/<script[^>]*>/gi.test(input)) {
    warnings.push('Contains script tags');
  }

  // Check for javascript: protocol
  if (/javascript:/gi.test(input)) {
    warnings.push('Contains javascript: protocol');
  }

  // Check for event handlers
  if (/on\w+\s*=/gi.test(input)) {
    warnings.push('Contains event handlers');
  }

  // Check for data: protocol
  if (/data:/gi.test(input)) {
    warnings.push('Contains data: protocol');
  }

  // Check for suspicious unicode
  const suspiciousUnicode = /[\u200B-\u200D\uFEFF]/g.test(input);
  if (suspiciousUnicode) {
    warnings.push('Contains suspicious unicode characters');
  }

  return {
    isSafe: warnings.length === 0,
    warnings,
  };
}

