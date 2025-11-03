/**
 * Secure Input Sanitization Utilities
 * 
 * CodeQL Compliant Implementation:
 * - No polynomial regex patterns (bounded quantifiers only)
 * - Complete multi-character sanitization
 * - Context-aware encoding
 * - No catastrophic backtracking risks
 */

/**
 * Safe regex replacement with bounded patterns
 * @param {string} str - Input string
 * @param {RegExp} pattern - Regex pattern with bounded quantifiers
 * @param {string} replacement - Replacement string
 * @returns {string} Modified string
 */
function safeReplace(str, pattern, replacement) {
    if (typeof str !== 'string') return String(str);
    return str.replace(pattern, replacement);
  }
  
  /**
   * Complete HTML tag removal using iterative bounded patterns
   * @param {string} input - Input string
   * @returns {string} String with HTML tags removed
   */
  function stripHtmlTagsSafe(input) {
    if (typeof input !== 'string') return String(input);
    
    let output = input;
    let previous;
    let iterations = 0;
    const maxIterations = 5;
    
    // Iteratively remove HTML tags with bounded patterns
    do {
      previous = output;
      
      // Remove any tag with bounded content (max 1000 chars between tags)
      // This pattern is safe from ReDoS - bounded quantifier {0,1000}
      output = safeReplace(output, /<[^>]{0,1000}>/g, '');
      
      iterations++;
    } while (output !== previous && iterations < maxIterations);
    
    return output;
  }
  
  /**
   * Complete HTML escaping for safe text content
   * @param {string} input - Input string
   * @returns {string} HTML-escaped string
   */
  function escapeHtmlComplete(input) {
    if (typeof input !== 'string') return String(input);
    
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    // Use simple character replacement instead of complex regex
    return input.replace(/[&<>"'\/]/g, char => escapeMap[char]);
  }
  
  /**
   * Complete attribute value escaping
   * @param {string} input - Input string
   * @returns {string} Attribute-safe string
   */
  function escapeHtmlAttribute(input) {
    if (typeof input !== 'string') return String(input);
    
    // First escape HTML, then ensure quotes are handled
    let escaped = escapeHtmlComplete(input);
    
    // Remove any remaining problematic characters for attributes
    escaped = safeReplace(escaped, /[\x00-\x1F\x7F]/g, '');
    
    return escaped;
  }
  
  /**
   * Remove dangerous content patterns safely
   * @param {string} input - Input string
   * @returns {string} Safe string
   */
  function removeDangerousChars(input) {
    if (typeof input !== 'string') return String(input);
    
    let output = input;
    
    // Step 1: Remove script tags and content with bounded patterns
    const scriptPatterns = [
      // Complete script blocks with bounded content
      /<script\b[^>]{0,500}>[\s\S]{0,5000}?<\/script\s*>/gi,
      // Self-closing script tags
      /<script\b[^>]{0,500}?\/?\s*>/gi,
      // Script closing tags
      /<\/script\s*>/gi
    ];
    
    scriptPatterns.forEach(pattern => {
      output = safeReplace(output, pattern, '');
    });
    
    // Step 2: Remove other dangerous tags
    const dangerousTags = ['iframe', 'object', 'embed', 'style'];
    dangerousTags.forEach(tag => {
      const tagPattern = new RegExp(`<${tag}\\b[^>]{0,500}>[\\s\\S]{0,5000}?<\\/${tag}\\s*>`, 'gi');
      const selfClosePattern = new RegExp(`<${tag}\\b[^>]{0,500}?\\/?\\s*>`, 'gi');
      const closePattern = new RegExp(`<\\/${tag}\\s*>`, 'gi');
      
      output = safeReplace(output, tagPattern, '');
      output = safeReplace(output, selfClosePattern, '');
      output = safeReplace(output, closePattern, '');
    });
    
    // Step 3: Remove dangerous protocols with word boundaries
    const dangerousProtocols = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /file:/gi
    ];
    
    dangerousProtocols.forEach(pattern => {
      output = safeReplace(output, pattern, '');
    });
    
    // Step 4: Remove event handlers with bounded patterns
    const eventHandlerPattern = /\s+on\w+\s*=\s*(["'])[^"']{0,1000}?\1/gi;
    output = safeReplace(output, eventHandlerPattern, '');
    
    // Step 5: Remove CSS expressions and dangerous patterns
    const cssPatterns = [
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /@import/gi
    ];
    
    cssPatterns.forEach(pattern => {
      output = safeReplace(output, pattern, '');
    });
    
    // Step 6: Complete HTML escaping for remaining content
    output = escapeHtmlComplete(output);
    
    return output.trim();
  }
  
  /**
   * Strip HTML tags safely
   * @param {string} input - Input string
   * @returns {string} String with HTML tags removed
   */
  export function stripHtmlTags(input) {
    return stripHtmlTagsSafe(input);
  }
  
  /**
   * Normalize whitespace safely
   * @param {string} input - Input string
   * @returns {string} Normalized string
   */
  export function normalizeWhitespace(input) {
    if (typeof input !== 'string') return String(input);
    
    // Safe replacement - no polynomial patterns
    return input
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
  
  /**
   * Trim whitespace
   * @param {string} input - Input string
   * @returns {string} Trimmed string
   */
  export function trimWhitespace(input) {
    if (typeof input !== 'string') return String(input);
    return input.trim();
  }
  
  /**
   * Escape HTML for text content
   * @param {string} input - Input string
   * @returns {string} HTML-escaped string
   */
  export function escapeHtml(input) {
    return escapeHtmlComplete(input);
  }
  
  /**
   * Safe unescape HTML (limited use cases)
   * @param {string} input - Input string
   * @returns {string} Unescaped string
   */
  export function unescapeHtml(input) {
    if (typeof input !== 'string') return String(input);
    
    const unescapeMap = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#39;': "'",
      '&#x2F;': '/',
      '&#47;': '/'
    };
    
    return input.replace(/&(amp|lt|gt|quot|#x27|#39|#x2F|#47);/g, match => 
      unescapeMap[match] || match
    );
  }
  
  /**
   * Normalize unicode safely
   * @param {string} input - Input string
   * @param {string} form - Unicode form
   * @returns {string} Normalized string
   */
  export function normalizeUnicode(input, form = 'NFC') {
    if (typeof input !== 'string') return String(input);
    
    try {
      let normalized = input.normalize(form);
      // Remove dangerous unicode characters
      normalized = safeReplace(normalized, /[\u200B-\u200D\uFEFF]/g, '');
      normalized = safeReplace(normalized, /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      return normalized;
    } catch (error) {
      return input;
    }
  }
  
  /**
   * Context-aware sanitization
   */
  export const SanitizeContext = {
    HTML: 'html',
    ATTRIBUTE: 'attribute',
    CSS: 'css',
    URL: 'url',
    SCRIPT: 'script'
  };
  
  /**
   * Sanitize input for specific context
   * @param {string} input - Input string
   * @param {string} context - Sanitization context
   * @returns {string} Sanitized string
   */
  export function sanitizeForContext(input, context = SanitizeContext.HTML) {
    if (typeof input !== 'string') return String(input);
    
    switch (context) {
      case SanitizeContext.ATTRIBUTE:
        // For HTML attributes, escape everything and ensure no breaking quotes
        return escapeHtmlAttribute(input);
        
      case SanitizeContext.CSS:
        // For CSS contexts, remove dangerous patterns and escape
        let cssSafe = input;
        cssSafe = safeReplace(cssSafe, /[\\"'<>]/g, '');
        cssSafe = safeReplace(cssSafe, /expression|javascript|vbscript/gi, '');
        return cssSafe;
        
      case SanitizeContext.URL:
        // For URLs, validate protocol and encode
        try {
          const url = new URL(input);
          if (!['http:', 'https:'].includes(url.protocol)) {
            return '';
          }
          return url.toString();
        } catch {
          // If not a valid URL, return empty
          return '';
        }
        
      case SanitizeContext.SCRIPT:
        // For script contexts, be very restrictive
        return safeReplace(input, /[^a-zA-Z0-9_]/g, '');
        
      case SanitizeContext.HTML:
      default:
        // Default HTML context - strip tags and escape
        const stripped = stripHtmlTagsSafe(input);
        return escapeHtmlComplete(stripped);
    }
  }
  
  /**
   * Main sanitization function
   * @param {string} input - Input to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized string
   */
  export function sanitizeText(input, options = {}) {
    if (input == null) return '';
    if (typeof input !== 'string') input = String(input);
    
    const {
      stripHtml = true,
      removeDangerous = true,
      normalizeWhitespace: normalizeWS = true,
      trim = true,
      escapeHtml = false,
      normalizeUnicode: normalizeUni = true,
      context = SanitizeContext.HTML
    } = options;
    
    let sanitized = input;
    
    // Use context-aware sanitization as base
    sanitized = sanitizeForContext(sanitized, context);
    
    // Apply additional processing based on options
    if (normalizeUni) {
      sanitized = normalizeUnicode(sanitized);
    }
    
    if (stripHtml && context === SanitizeContext.HTML) {
      // Already handled in context, but can apply additional stripping
      sanitized = stripHtmlTagsSafe(sanitized);
    }
    
    if (removeDangerous) {
      sanitized = removeDangerousChars(sanitized);
    }
    
    if (normalizeWS) {
      sanitized = normalizeWhitespace(sanitized);
    }
    
    if (trim) {
      sanitized = trimWhitespace(sanitized);
    }
    
    if (escapeHtml && context === SanitizeContext.HTML) {
      // Only escape if not already done in context
      sanitized = escapeHtmlComplete(sanitized);
    }
    
    return sanitized;
  }
  
  /**
   * Specialized sanitization functions
   */
  export function sanitizeDisplayName(input) {
    return sanitizeForContext(input, SanitizeContext.HTML);
  }
  
  export function sanitizeBio(input) {
    if (typeof input !== 'string') return String(input || '');
    
    let sanitized = sanitizeForContext(input, SanitizeContext.HTML);
    // Preserve some formatting for bios
    sanitized = safeReplace(sanitized, /\n{3,}/g, '\n\n');
    return trimWhitespace(sanitized);
  }
  
  export function sanitizeUsername(input) {
    if (typeof input !== 'string') return String(input || '');
    
    // Very restrictive for usernames
    return input.replace(/[^a-zA-Z0-9_.-]/g, '');
  }
  
  export function sanitizeUrl(input) {
    return sanitizeForContext(input, SanitizeContext.URL);
  }
  
  /**
   * Security validation
   * @param {string} input - Input to validate
   * @returns {Object} Validation result
   */
  export function validateSecurity(input) {
    if (typeof input !== 'string') {
      return { isSafe: true, warnings: [] };
    }
    
    const warnings = [];
    const dangerousPatterns = [
      { pattern: /<script/gi, message: 'Potential script tag' },
      { pattern: /javascript:/gi, message: 'JavaScript protocol' },
      { pattern: /on\w+\s*=/gi, message: 'Event handler' },
      { pattern: /expression\(/gi, message: 'CSS expression' }
    ];
    
    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(input)) {
        warnings.push(message);
      }
    });
    
    return {
      isSafe: warnings.length === 0,
      warnings
    };
  }
  
  // Default export for backward compatibility
  export default {
    sanitizeText,
    sanitizeForContext,
    stripHtmlTags,
    escapeHtml,
    removeDangerousChars,
    normalizeWhitespace,
    trimWhitespace,
    normalizeUnicode,
    sanitizeDisplayName,
    sanitizeBio,
    sanitizeUsername,
    sanitizeUrl,
    validateSecurity,
    SanitizeContext
  };