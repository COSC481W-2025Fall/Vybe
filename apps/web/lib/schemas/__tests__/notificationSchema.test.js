import { describe, it, expect } from 'vitest';
import { notificationSchema, notificationPartialSchema, getDefaultNotificationPreferences } from '../notificationSchema.js';

describe('Notification Schema Validation', () => {
  describe('Valid Inputs', () => {
    it('should pass validation with all valid fields', () => {
      const validData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with default settings', () => {
      const defaultSettings = getDefaultNotificationPreferences();
      const result = notificationSchema.safeParse(defaultSettings);
      expect(result.success).toBe(true);
    });

    it('should pass validation with all notifications disabled (except security)', () => {
      const validData = {
        friend_requests_inapp: false,
        friend_requests_email: false,
        new_followers_inapp: false,
        new_followers_email: false,
        comments_inapp: false,
        comments_email: false,
        playlist_invites_inapp: false,
        playlist_invites_email: false,
        playlist_updates_inapp: false,
        playlist_updates_email: false,
        song_of_day_inapp: false,
        song_of_day_email: false,
        system_announcements_inapp: false,
        system_announcements_email: false,
        security_alerts_inapp: true, // Must be true
        security_alerts_email: true, // Must be true
        email_frequency: 'weekly',
        notifications_enabled: false,
      };

      const result = notificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with all email frequency options', () => {
      const frequencies = ['instant', 'daily', 'weekly'];

      frequencies.forEach(frequency => {
        const validData = {
          friend_requests_inapp: true,
          friend_requests_email: true,
          new_followers_inapp: true,
          new_followers_email: true,
          comments_inapp: true,
          comments_email: true,
          playlist_invites_inapp: true,
          playlist_invites_email: true,
          playlist_updates_inapp: true,
          playlist_updates_email: true,
          song_of_day_inapp: true,
          song_of_day_email: true,
          system_announcements_inapp: true,
          system_announcements_email: true,
          security_alerts_inapp: true,
          security_alerts_email: true,
          email_frequency: frequency,
          notifications_enabled: true,
        };

        const result = notificationSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Security Alerts Enforcement', () => {
    it('should fail validation when security_alerts_inapp is false', () => {
      const invalidData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: false, // Invalid: must be true
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => 
          e.path.includes('security_alerts_inapp') || 
          e.message.includes('Security alerts must always be enabled')
        );
        expect(error).toBeDefined();
      }
    });

    it('should fail validation when security_alerts_email is false', () => {
      const invalidData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: false, // Invalid: must be true
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => 
          e.path.includes('security_alerts_email') || 
          e.message.includes('Security alerts must always be enabled')
        );
        expect(error).toBeDefined();
      }
    });

    it('should fail validation when both security alerts are false', () => {
      const invalidData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: false, // Invalid
        security_alerts_email: false, // Invalid
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should pass validation when both security alerts are true', () => {
      const validData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Email Frequency', () => {
    it('should fail validation when email_frequency is invalid', () => {
      const invalidData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'invalid',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path.includes('email_frequency'));
        expect(error?.message).toContain('instant, daily, or weekly');
      }
    });

    it('should fail validation when email_frequency is missing', () => {
      const invalidData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Boolean Values', () => {
    it('should fail validation when notification toggle is not a boolean', () => {
      const invalidData = {
        friend_requests_inapp: 'true',
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when notifications_enabled is not a boolean', () => {
      const invalidData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: 'yes',
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Missing Required Fields', () => {
    it('should fail validation when friend_requests_inapp is missing', () => {
      const invalidData = {
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: true,
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail validation when multiple fields are missing', () => {
      const invalidData = {
        friend_requests_inapp: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
      };

      const result = notificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Partial Schema', () => {
    it('should pass validation with partial schema (only friend_requests_inapp)', () => {
      const partialData = {
        friend_requests_inapp: false,
      };

      const result = notificationPartialSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with partial schema (multiple fields)', () => {
      const partialData = {
        friend_requests_inapp: false,
        friend_requests_email: true,
        email_frequency: 'daily',
      };

      const result = notificationPartialSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should pass validation with empty object (all optional in partial)', () => {
      const partialData = {};

      const result = notificationPartialSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should still enforce security alerts in partial schema', () => {
      const invalidData = {
        security_alerts_inapp: false,
      };

      const result = notificationPartialSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should still validate enum values in partial schema', () => {
      const invalidData = {
        email_frequency: 'invalid',
      };

      const result = notificationPartialSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should still validate boolean types in partial schema', () => {
      const invalidData = {
        friend_requests_inapp: 'maybe',
      };

      const result = notificationPartialSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      const result = notificationSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should handle undefined input', () => {
      const result = notificationSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle empty object', () => {
      const result = notificationSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should handle extra fields gracefully', () => {
      const validData = {
        friend_requests_inapp: true,
        friend_requests_email: true,
        new_followers_inapp: true,
        new_followers_email: false,
        comments_inapp: true,
        comments_email: false,
        playlist_invites_inapp: true,
        playlist_invites_email: true,
        playlist_updates_inapp: true,
        playlist_updates_email: false,
        song_of_day_inapp: true,
        song_of_day_email: false,
        system_announcements_inapp: true,
        system_announcements_email: true,
        security_alerts_inapp: true,
        security_alerts_email: true,
        email_frequency: 'instant',
        notifications_enabled: true,
        extra_field: 'should be ignored',
      };

      const result = notificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extra_field).toBeUndefined();
      }
    });
  });

  describe('All Boolean Combinations', () => {
    it('should accept all boolean combinations for notification toggles', () => {
      const combinations = [true, false];

      combinations.forEach(value => {
        const validData = {
          friend_requests_inapp: value,
          friend_requests_email: value,
          new_followers_inapp: value,
          new_followers_email: value,
          comments_inapp: value,
          comments_email: value,
          playlist_invites_inapp: value,
          playlist_invites_email: value,
          playlist_updates_inapp: value,
          playlist_updates_email: value,
          song_of_day_inapp: value,
          song_of_day_email: value,
          system_announcements_inapp: value,
          system_announcements_email: value,
          security_alerts_inapp: true, // Must always be true
          security_alerts_email: true, // Must always be true
          email_frequency: 'instant',
          notifications_enabled: value,
        };

        const result = notificationSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getDefaultNotificationPreferences', () => {
      it('should return valid default settings', () => {
        const defaults = getDefaultNotificationPreferences();
        const result = notificationSchema.safeParse(defaults);
        expect(result.success).toBe(true);
      });

      it('should return all required fields', () => {
        const defaults = getDefaultNotificationPreferences();
        expect(defaults).toHaveProperty('friend_requests_inapp');
        expect(defaults).toHaveProperty('friend_requests_email');
        expect(defaults).toHaveProperty('security_alerts_inapp');
        expect(defaults).toHaveProperty('security_alerts_email');
        expect(defaults).toHaveProperty('email_frequency');
        expect(defaults).toHaveProperty('notifications_enabled');
      });

      it('should return security alerts as true', () => {
        const defaults = getDefaultNotificationPreferences();
        expect(defaults.security_alerts_inapp).toBe(true);
        expect(defaults.security_alerts_email).toBe(true);
      });
    });
  });
});

