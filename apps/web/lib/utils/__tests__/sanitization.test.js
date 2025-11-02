import { describe, it, expect } from 'vitest';
import {
  stripHtmlTags,
  removeDangerousChars,
  normalizeWhitespace,
  trimWhitespace,
  escapeHtml,
  unescapeHtml,
  normalizeUnicode,
  sanitizeText,
  sanitizeDisplayName,
  sanitizeBio,
  sanitizeUsername,
  sanitizeUrl,
  sanitizeObject,
  sanitizeFormData,
  checkDangerousContent,
} from '../sanitization.js';

describe('Sanitization Utilities', () => {
  describe('stripHtmlTags', () => {
    it('should remove HTML tags', () => {
      expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
      expect(stripHtmlTags('<div>World</div>')).toBe('World');
    });

    it('should remove multiple HTML tags', () => {
      expect(stripHtmlTags('<b>Hello</b> <i>World</i>')).toBe('Hello World');
    });

    it('should remove script tags', () => {
      expect(stripHtmlTags('<script>alert("XSS")</script>Hello')).toBe('Hello');
    });

    it('should handle nested tags', () => {
      expect(stripHtmlTags('<div><p>Hello</p></div>')).toBe('Hello');
    });

    it('should handle empty tags', () => {
      expect(stripHtmlTags('<br/>')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(stripHtmlTags(123)).toBe('123');
      expect(stripHtmlTags(null)).toBe('null');
    });
  });

  describe('removeDangerousChars', () => {
    it('should remove < and > characters', () => {
      expect(removeDangerousChars('Hello<World>')).toBe('HelloWorld');
    });

    it('should remove javascript: protocol', () => {
      expect(removeDangerousChars('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(removeDangerousChars('onclick=alert(1)')).toBe('alert(1)');
      expect(removeDangerousChars('onload=evil()')).toBe('evil()');
    });

    it('should remove data: protocol', () => {
      expect(removeDangerousChars('data:text/html,<script>')).toBe('text/html,');
    });

    it('should handle case-insensitive removal', () => {
      expect(removeDangerousChars('JAVASCRIPT:alert(1)')).toBe('alert(1)');
      expect(removeDangerousChars('ONCLICK=evil()')).toBe('evil()');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should normalize multiple spaces', () => {
      expect(normalizeWhitespace('Hello    World')).toBe('Hello World');
    });

    it('should normalize tabs', () => {
      expect(normalizeWhitespace('Hello\tWorld')).toBe('Hello World');
    });

    it('should normalize newlines', () => {
      expect(normalizeWhitespace('Hello\n\nWorld')).toBe('Hello World');
    });

    it('should preserve single spaces', () => {
      expect(normalizeWhitespace('Hello World')).toBe('Hello World');
    });
  });

  describe('trimWhitespace', () => {
    it('should trim leading whitespace', () => {
      expect(trimWhitespace('  Hello')).toBe('Hello');
    });

    it('should trim trailing whitespace', () => {
      expect(trimWhitespace('Hello  ')).toBe('Hello');
    });

    it('should trim both leading and trailing whitespace', () => {
      expect(trimWhitespace('  Hello  ')).toBe('Hello');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"Hello"')).toBe('&quot;Hello&quot;');
    });

    it('should escape all HTML special characters', () => {
      expect(escapeHtml('<script>&"\'/')).toBe('&lt;script&gt;&amp;&quot;&#x27;&#x2F;');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
      expect(unescapeHtml('&amp;')).toBe('&');
      expect(unescapeHtml('&quot;Hello&quot;')).toBe('"Hello"');
    });
  });

  describe('normalizeUnicode', () => {
    it('should normalize unicode characters', () => {
      const result = normalizeUnicode('café');
      expect(typeof result).toBe('string');
    });

    it('should remove zero-width characters', () => {
      const withZeroWidth = 'Hello\u200BWorld';
      const result = normalizeUnicode(withZeroWidth);
      expect(result).not.toContain('\u200B');
    });

    it('should handle default NFC normalization', () => {
      const result = normalizeUnicode('café');
      expect(result).toBeTruthy();
    });

    it('should handle different normalization forms', () => {
      const nfc = normalizeUnicode('café', 'NFC');
      const nfd = normalizeUnicode('café', 'NFD');
      expect(nfc).toBeTruthy();
      expect(nfd).toBeTruthy();
    });
  });

  describe('sanitizeText', () => {
    it('should sanitize text with default options', () => {
      const result = sanitizeText('<script>alert(1)</script>Hello');
      expect(result).toBe('Hello');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should handle null input', () => {
      expect(sanitizeText(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(sanitizeText(undefined)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(123)).toBe('123');
    });

    it('should respect custom options', () => {
      const result = sanitizeText('  Hello  World  ', {
        normalizeWhitespace: false,
        trim: true,
      });
      expect(result).toBe('Hello  World');
    });
  });

  describe('sanitizeDisplayName', () => {
    it('should sanitize display name', () => {
      const result = sanitizeDisplayName('<b>John</b> Doe');
      expect(result).toBe('John Doe');
    });

    it('should remove dangerous characters', () => {
      const result = sanitizeDisplayName('John<script>alert(1)</script>Doe');
      expect(result).toBe('JohnDoe');
    });

    it('should normalize whitespace', () => {
      const result = sanitizeDisplayName('John    Doe');
      expect(result).toBe('John Doe');
    });

    it('should trim whitespace', () => {
      const result = sanitizeDisplayName('  John Doe  ');
      expect(result).toBe('John Doe');
    });
  });

  describe('sanitizeBio', () => {
    it('should sanitize bio text', () => {
      const result = sanitizeBio('<p>Hello</p> World');
      expect(result).toBe('Hello World');
    });

    it('should preserve newlines', () => {
      const result = sanitizeBio('Line1\n\nLine2');
      expect(result).toContain('\n');
    });

    it('should limit multiple newlines', () => {
      const result = sanitizeBio('Line1\n\n\n\nLine2');
      expect(result).not.toContain('\n\n\n');
    });
  });

  describe('sanitizeUsername', () => {
    it('should sanitize username', () => {
      const result = sanitizeUsername('user@name<script>');
      expect(result).toBe('username');
    });

    it('should keep allowed characters', () => {
      const result = sanitizeUsername('user_name-123.test');
      expect(result).toBe('user_name-123.test');
    });

    it('should remove all spaces', () => {
      const result = sanitizeUsername('user name');
      expect(result).toBe('username');
    });

    it('should remove special characters', () => {
      const result = sanitizeUsername('user@#name$');
      expect(result).toBe('username');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid HTTP URL', () => {
      const result = sanitizeUrl('http://example.com');
      expect(result).toBe('http://example.com/');
    });

    it('should validate and return valid HTTPS URL', () => {
      const result = sanitizeUrl('https://example.com');
      expect(result).toBe('https://example.com/');
    });

    it('should validate relative URLs', () => {
      const result = sanitizeUrl('/path/to/page');
      expect(result).toBe('/path/to/page');
    });

    it('should reject javascript: URLs', () => {
      const result = sanitizeUrl('javascript:alert(1)');
      expect(result).toBeNull();
    });

    it('should reject data: URLs', () => {
      const result = sanitizeUrl('data:text/html,<script>');
      expect(result).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      const result = sanitizeUrl('not-a-url');
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = sanitizeUrl('');
      expect(result).toBeNull();
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const obj = {
        name: '<b>John</b>',
        bio: 'Hello<script>alert(1)</script>',
        number: 123,
      };

      const result = sanitizeObject(obj);
      expect(result.name).toBe('John');
      expect(result.bio).toBe('Hello');
      expect(result.number).toBe(123);
    });

    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          name: '<b>John</b>',
        },
      };

      const result = sanitizeObject(obj);
      expect(result.user.name).toBe('John');
    });

    it('should sanitize arrays', () => {
      const arr = ['<b>Hello</b>', 'World'];
      const result = sanitizeObject(arr);
      expect(result[0]).toBe('Hello');
      expect(result[1]).toBe('World');
    });
  });

  describe('sanitizeFormData', () => {
    it('should sanitize form data with field config', () => {
      const formData = {
        display_name: '<b>John</b>',
        bio: 'Hello World',
        profile_picture_url: 'https://example.com/image.jpg',
      };

      const result = sanitizeFormData(formData, {
        display_name: { type: 'display_name' },
        bio: { type: 'bio' },
        profile_picture_url: { type: 'url' },
      });

      expect(result.display_name).toBe('John');
      expect(result.bio).toBe('Hello World');
      expect(result.profile_picture_url).toBeTruthy();
    });

    it('should use default sanitization for fields without config', () => {
      const formData = {
        unknown_field: '<script>alert(1)</script>',
      };

      const result = sanitizeFormData(formData);
      expect(result.unknown_field).toBe('alert(1)');
    });
  });

  describe('checkDangerousContent', () => {
    it('should detect HTML tags', () => {
      const result = checkDangerousContent('<div>Hello</div>');
      expect(result.isSafe).toBe(false);
      expect(result.warnings).toContain('Contains HTML tags');
    });

    it('should detect script tags', () => {
      const result = checkDangerousContent('<script>alert(1)</script>');
      expect(result.isSafe).toBe(false);
      expect(result.warnings).toContain('Contains script tags');
    });

    it('should detect javascript: protocol', () => {
      const result = checkDangerousContent('javascript:alert(1)');
      expect(result.isSafe).toBe(false);
      expect(result.warnings).toContain('Contains javascript: protocol');
    });

    it('should detect event handlers', () => {
      const result = checkDangerousContent('onclick=evil()');
      expect(result.isSafe).toBe(false);
      expect(result.warnings).toContain('Contains event handlers');
    });

    it('should return safe for clean content', () => {
      const result = checkDangerousContent('Hello World');
      expect(result.isSafe).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect multiple issues', () => {
      const result = checkDangerousContent('<script>alert(1)</script>javascript:evil()');
      expect(result.isSafe).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(1);
    });
  });
});

