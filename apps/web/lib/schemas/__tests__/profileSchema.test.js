import { describe, it, expect } from 'vitest';
import { profileSchema } from '../profileSchema.js';

describe('Profile Schema Validation', () => {
  describe('Valid Inputs', () => {
    it('should pass validation with valid display name, bio, and URL', () => {
      const validData = {
        display_name: 'John Doe',
        bio: 'My bio',
        profile_picture_url: 'https://example.com/image.jpg',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.display_name).toBe('John Doe');
        expect(result.data.bio).toBe('My bio');
        expect(result.data.profile_picture_url).toBe('https://example.com/image.jpg');
      }
    });

    it('should pass validation with minimal valid data (just display name)', () => {
      const validData = {
        display_name: 'JD',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with empty bio', () => {
      const validData = {
        display_name: 'John Doe',
        bio: '',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bio).toBeUndefined();
      }
    });

    it('should pass validation with null bio', () => {
      const validData = {
        display_name: 'John Doe',
        bio: null,
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with null profile picture URL', () => {
      const validData = {
        display_name: 'John Doe',
        profile_picture_url: null,
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with empty profile picture URL', () => {
      const validData = {
        display_name: 'John Doe',
        profile_picture_url: '',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profile_picture_url).toBeNull();
      }
    });

    it('should trim whitespace from display name', () => {
      const validData = {
        display_name: '  John Doe  ',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.display_name).toBe('John Doe');
      }
    });

    it('should pass validation with maximum length display name (50 chars)', () => {
      const validData = {
        display_name: 'A'.repeat(50),
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with maximum length bio (200 chars)', () => {
      const validData = {
        display_name: 'John Doe',
        bio: 'A'.repeat(200),
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with valid File object for profile picture', () => {
      // Create a mock File object
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

      const validData = {
        display_name: 'John Doe',
        profile_picture_url: mockFile,
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Display Name', () => {
    it('should fail validation when display name is missing', () => {
      const invalidData = {
        bio: 'My bio',
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('display_name');
        expect(result.error.errors[0].message).toContain('required');
      }
    });

    it('should fail validation when display name is too short (1 character)', () => {
      const invalidData = {
        display_name: 'A',
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('display_name'));
        expect(error?.message).toContain('at least 2 characters');
      }
    });

    it('should fail validation when display name is too long (51 characters)', () => {
      const invalidData = {
        display_name: 'A'.repeat(51),
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('display_name'));
        expect(error?.message).toContain('exceed 50 characters');
      }
    });

    it('should fail validation when display name contains special characters', () => {
      const invalidData = {
        display_name: 'John@Doe',
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('display_name'));
        expect(error?.message).toContain('letters, numbers, and spaces');
      }
    });

    it('should fail validation when display name contains only spaces', () => {
      const invalidData = {
        display_name: '   ',
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when display name is not a string', () => {
      const invalidData = {
        display_name: 123,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('display_name'));
        expect(error?.message).toContain('string');
      }
    });

    it('should fail validation when display name is empty string', () => {
      const invalidData = {
        display_name: '',
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when display name is null', () => {
      const invalidData = {
        display_name: null,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when display name is undefined', () => {
      const invalidData = {
        display_name: undefined,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Bio', () => {
    it('should fail validation when bio exceeds 200 characters', () => {
      const invalidData = {
        display_name: 'John Doe',
        bio: 'A'.repeat(201),
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('bio'));
        expect(error?.message).toContain('exceed 200 characters');
      }
    });

    it('should fail validation when bio is not a string', () => {
      const invalidData = {
        display_name: 'John Doe',
        bio: 123,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('bio'));
        expect(error?.message).toContain('string');
      }
    });
  });

  describe('Invalid Profile Picture URL', () => {
    it('should fail validation when profile picture URL is invalid', () => {
      const invalidData = {
        display_name: 'John Doe',
        profile_picture_url: 'not-a-url',
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('profile_picture_url'));
        expect(error?.message).toContain('URL');
      }
    });

    it('should fail validation when profile picture URL is invalid File type', () => {
      const mockFile = new File([''], 'test.txt', { type: 'text/plain' });

      const invalidData = {
        display_name: 'John Doe',
        profile_picture_url: mockFile,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('profile_picture_url'));
        expect(error?.message).toContain('JPEG, PNG, WebP, or GIF');
      }
    });

    it('should fail validation when profile picture File is too large', () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const invalidData = {
        display_name: 'John Doe',
        profile_picture_url: mockFile,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('profile_picture_url'));
        expect(error?.message).toContain('smaller than 5MB');
      }
    });

    it('should fail validation when profile picture is not string, File, null, or empty', () => {
      const invalidData = {
        display_name: 'John Doe',
        profile_picture_url: 123,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const invalidData = {};

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle null input', () => {
      const result = profileSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = profileSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle extra fields gracefully', () => {
      const validData = {
        display_name: 'John Doe',
        extra_field: 'should be ignored',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extra_field).toBeUndefined();
      }
    });

    it('should handle boundary condition: exactly 2 characters', () => {
      const validData = {
        display_name: 'AB',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should handle boundary condition: exactly 50 characters', () => {
      const validData = {
        display_name: 'A'.repeat(50),
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should handle boundary condition: exactly 200 characters in bio', () => {
      const validData = {
        display_name: 'John Doe',
        bio: 'A'.repeat(200),
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Special Characters', () => {
    it('should allow spaces in display name', () => {
      const validData = {
        display_name: 'John Doe Smith',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow numbers in display name', () => {
      const validData = {
        display_name: 'John123',
      };

      const result = profileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject display names with symbols', () => {
      const symbols = ['@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
      
      symbols.forEach(symbol => {
        const invalidData = {
          display_name: `John${symbol}Doe`,
        };

        const result = profileSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Type Coercion', () => {
    it('should not coerce numbers to strings for display name', () => {
      const invalidData = {
        display_name: 12345,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should not coerce booleans to strings for display name', () => {
      const invalidData = {
        display_name: true,
      };

      const result = profileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

