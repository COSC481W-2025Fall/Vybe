import { describe, it, expect } from 'vitest';
import { privacySchema, privacyPartialSchema, getDefaultPrivacySettings, isMoreRestrictive } from '../privacySchema.js';

describe('Privacy Schema Validation', () => {
  describe('Valid Inputs', () => {
    it('should pass validation with all valid fields', () => {
      const validData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with private profile and appropriate settings', () => {
      const validData = {
        profile_visibility: 'private',
        playlist_visibility: 'private',
        listening_activity_visible: false,
        song_of_day_visibility: 'private',
        friend_request_setting: 'nobody',
        searchable: false,
        activity_feed_visible: false,
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with friends visibility', () => {
      const validData = {
        profile_visibility: 'friends',
        playlist_visibility: 'friends',
        listening_activity_visible: true,
        song_of_day_visibility: 'friends',
        friend_request_setting: 'friends_of_friends',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with default settings', () => {
      const defaultSettings = getDefaultPrivacySettings();
      const result = privacySchema.safeParse(defaultSettings);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Enum Values', () => {
    it('should fail validation when profile_visibility is invalid', () => {
      const invalidData = {
        profile_visibility: 'invalid',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error?.issues) {
        const error = result.error.issues.find(e => e.path?.includes('profile_visibility')) || result.error.issues[0];
        expect(error?.message).toMatch(/Invalid.*expected one of.*"public"|"friends"|"private"/i);
      }
    });

    it('should fail validation when playlist_visibility is invalid', () => {
      const invalidData = {
        profile_visibility: 'public',
        playlist_visibility: 'invalid',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when song_of_day_visibility is invalid', () => {
      const invalidData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'invalid',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when friend_request_setting is invalid', () => {
      const invalidData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'invalid',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Boolean Values', () => {
    it('should fail validation when listening_activity_visible is not a boolean', () => {
      const invalidData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: 'true',
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when searchable is not a boolean', () => {
      const invalidData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: 'yes',
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when activity_feed_visible is not a boolean', () => {
      const invalidData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: 1,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Missing Required Fields', () => {
    it('should fail validation when profile_visibility is missing', () => {
      const invalidData = {
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when multiple fields are missing', () => {
      const invalidData = {
        profile_visibility: 'public',
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Privacy Combination Validation', () => {
    it('should fail validation when profile is private but searchable is true', () => {
      const invalidData = {
        profile_visibility: 'private',
        playlist_visibility: 'private',
        listening_activity_visible: false,
        song_of_day_visibility: 'private',
        friend_request_setting: 'nobody',
        searchable: true, // Invalid: private profile cannot be searchable
        activity_feed_visible: false,
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error?.issues) {
        const error = result.error.issues.find(e => 
          e.message?.includes('searchable') || e.message?.includes('Private profiles')
        ) || result.error.issues[0];
        expect(error).toBeDefined();
      }
    });

    it('should fail validation when profile is private but activity_feed_visible is true', () => {
      const invalidData = {
        profile_visibility: 'private',
        playlist_visibility: 'private',
        listening_activity_visible: false,
        song_of_day_visibility: 'private',
        friend_request_setting: 'nobody',
        searchable: false,
        activity_feed_visible: true, // Invalid: private profile cannot have visible activity feed
      };

      const result = privacySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error?.issues) {
        const error = result.error.issues.find(e => 
          e.message?.includes('activity feed') || e.message?.includes('Private profiles')
        ) || result.error.issues[0];
        expect(error).toBeDefined();
      }
    });

    it('should pass validation when profile is private with all appropriate restrictions', () => {
      const validData = {
        profile_visibility: 'private',
        playlist_visibility: 'private',
        listening_activity_visible: false,
        song_of_day_visibility: 'private',
        friend_request_setting: 'nobody',
        searchable: false,
        activity_feed_visible: false,
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation when profile is public with searchable and activity feed visible', () => {
      const validData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation when profile is friends with searchable and activity feed visible', () => {
      const validData = {
        profile_visibility: 'friends',
        playlist_visibility: 'friends',
        listening_activity_visible: true,
        song_of_day_visibility: 'friends',
        friend_request_setting: 'friends_of_friends',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Partial Schema', () => {
    it('should pass validation with partial schema (only profile_visibility)', () => {
      const partialData = {
        profile_visibility: 'private',
      };

      const result = privacyPartialSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with partial schema (multiple fields)', () => {
      const partialData = {
        profile_visibility: 'friends',
        searchable: false,
      };

      const result = privacyPartialSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with empty object (all optional in partial)', () => {
      const partialData = {};

      const result = privacyPartialSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should still validate enum values in partial schema', () => {
      const invalidData = {
        profile_visibility: 'invalid',
      };

      const result = privacyPartialSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      const result = privacySchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = privacySchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle empty object', () => {
      const result = privacySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should handle extra fields gracefully', () => {
      const validData = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
        extra_field: 'should be ignored',
      };

      const result = privacySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extra_field).toBeUndefined();
      }
    });
  });

  describe('All Enum Values', () => {
    it('should accept all valid profile_visibility values', () => {
      const values = ['public', 'friends', 'private'];
      
      values.forEach(value => {
        const data = {
          profile_visibility: value,
          playlist_visibility: 'public',
          listening_activity_visible: true,
          song_of_day_visibility: 'public',
          friend_request_setting: 'everyone',
          searchable: value !== 'private', // Adjust based on privacy rules
          activity_feed_visible: value !== 'private',
        };

        const result = privacySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should accept all valid friend_request_setting values', () => {
      const values = ['everyone', 'friends_of_friends', 'nobody'];
      
      values.forEach(value => {
        const data = {
          profile_visibility: 'public',
          playlist_visibility: 'public',
          listening_activity_visible: true,
          song_of_day_visibility: 'public',
          friend_request_setting: value,
          searchable: true,
          activity_feed_visible: true,
        };

        const result = privacySchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Boolean Values', () => {
    it('should accept true for all boolean fields', () => {
      const data = {
        profile_visibility: 'public',
        playlist_visibility: 'public',
        listening_activity_visible: true,
        song_of_day_visibility: 'public',
        friend_request_setting: 'everyone',
        searchable: true,
        activity_feed_visible: true,
      };

      const result = privacySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept false for all boolean fields', () => {
      const data = {
        profile_visibility: 'private',
        playlist_visibility: 'private',
        listening_activity_visible: false,
        song_of_day_visibility: 'private',
        friend_request_setting: 'nobody',
        searchable: false,
        activity_feed_visible: false,
      };

      const result = privacySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('getDefaultPrivacySettings', () => {
      it('should return valid default settings', () => {
        const defaults = getDefaultPrivacySettings();
        const result = privacySchema.safeParse(defaults);
        expect(result.success).toBe(true);
      });

      it('should return all required fields', () => {
        const defaults = getDefaultPrivacySettings();
        expect(defaults).toHaveProperty('profile_visibility');
        expect(defaults).toHaveProperty('playlist_visibility');
        expect(defaults).toHaveProperty('listening_activity_visible');
        expect(defaults).toHaveProperty('song_of_day_visibility');
        expect(defaults).toHaveProperty('friend_request_setting');
        expect(defaults).toHaveProperty('searchable');
        expect(defaults).toHaveProperty('activity_feed_visible');
      });
    });

    describe('isMoreRestrictive', () => {
      it('should return true when moving from public to friends', () => {
        expect(isMoreRestrictive('public', 'friends')).toBe(true);
      });

      it('should return true when moving from public to private', () => {
        expect(isMoreRestrictive('public', 'private')).toBe(true);
      });

      it('should return true when moving from friends to private', () => {
        expect(isMoreRestrictive('friends', 'private')).toBe(true);
      });

      it('should return false when moving from private to friends', () => {
        expect(isMoreRestrictive('private', 'friends')).toBe(false);
      });

      it('should return false when moving from friends to public', () => {
        expect(isMoreRestrictive('friends', 'public')).toBe(false);
      });

      it('should return false when moving from private to public', () => {
        expect(isMoreRestrictive('private', 'public')).toBe(false);
      });

      it('should return false when moving to same level', () => {
        expect(isMoreRestrictive('public', 'public')).toBe(false);
        expect(isMoreRestrictive('friends', 'friends')).toBe(false);
        expect(isMoreRestrictive('private', 'private')).toBe(false);
      });
    });
  });
});

