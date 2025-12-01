'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Users, Music, MessageSquare, Megaphone, Shield, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import SettingsPageWrapper, { useSettingsContext } from '@/components/SettingsPageWrapper';
import { NotificationToggle } from '@/components/NotificationToggle';
import { notificationSchema, getDefaultNotificationPreferences } from '@/lib/schemas/notificationSchema';
import { useNotificationPreferences, useNotificationPreferencesUpdate } from '@/hooks/useNotificationPreferences';

// Inner component that uses the context (must be inside SettingsPageWrapper)
function NotificationSettingsContent() {
  const { setHasUnsavedChanges, setFormSubmitHandler, setFormResetHandler } = useSettingsContext();
  
  // Fetch notification preferences using TanStack Query
  const { data: notificationData, isLoading: loading, error: notificationError } = useNotificationPreferences();
  const notificationUpdate = useNotificationPreferencesUpdate();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: getDefaultNotificationPreferences(),
  });

  // Watch all form values
  const notificationsEnabled = watch('notifications_enabled');
  const emailFrequency = watch('email_frequency');

  // Store original form values for cancel
  const [originalValues, setOriginalValues] = useState(null);

  // Update unsaved changes indicator when form is dirty
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  // Initialize form with fetched notification preferences
  useEffect(() => {
    if (notificationData) {
      // Set all form values from API response
      Object.keys(notificationData).forEach(key => {
        if (key !== 'message') { // Exclude success message from form data
          setValue(key, notificationData[key], { shouldDirty: false });
        }
      });
      
      setOriginalValues(notificationData);
    } else if (!loading && !notificationError) {
      // If no data and not loading, use defaults
      const defaultValues = getDefaultNotificationPreferences();
      Object.keys(defaultValues).forEach(key => {
        setValue(key, defaultValues[key], { shouldDirty: false });
      });
      setOriginalValues(defaultValues);
    }
  }, [notificationData, loading, notificationError, setValue]);

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      // Ensure security alerts are always enabled
      const submitData = {
        ...data,
        security_alerts_inapp: true,
        security_alerts_email: true,
      };
      
      // Use TanStack Query mutation to update preferences
      const updatedPreferences = await notificationUpdate.mutateAsync(submitData);
      
      // Reset form with updated data
      reset(updatedPreferences);
      setOriginalValues(updatedPreferences);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      // Error toast is handled by the mutation hook
      throw error;
    }
  };

  // Register form submit handler with the wrapper
  useEffect(() => {
    const submitFn = () => {
      return handleSubmit(onSubmit)();
    };
    setFormSubmitHandler(() => submitFn);
  }, [handleSubmit, setFormSubmitHandler]);

  // Register form reset handler with the wrapper
  useEffect(() => {
    const resetFn = () => {
      if (originalValues) {
        reset(originalValues);
      }
    };
    setFormResetHandler(() => resetFn);
  }, [reset, originalValues, setFormResetHandler]);

  // Master toggle handler
  const handleMasterToggle = (enabled) => {
    const allNotificationFields = [
      'friend_requests_inapp', 'friend_requests_email',
      'new_followers_inapp', 'new_followers_email',
      'comments_inapp', 'comments_email',
      'playlist_invites_inapp', 'playlist_invites_email',
      'playlist_updates_inapp', 'playlist_updates_email',
      'song_of_day_inapp', 'song_of_day_email',
      'system_announcements_inapp', 'system_announcements_email',
    ];
    
    allNotificationFields.forEach(field => {
      setValue(field, enabled, { shouldDirty: true });
    });
    
    // Keep security alerts enabled
    setValue('security_alerts_inapp', true, { shouldDirty: true });
    setValue('security_alerts_email', true, { shouldDirty: true });
  };

  // Loading state
  if (loading) {
    return (
      <>
        <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Notifications</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Configure your notification preferences
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 w-full">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (notificationError) {
    return (
      <>
        <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Notifications</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Configure your notification preferences
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 w-full">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-red-400">Error loading notification preferences: {notificationError.message}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Notifications</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Configure your notification preferences
            </p>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 w-full">
        <div className="space-y-8 w-full">
          {/* Master Toggle */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Enable All Notifications</h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Master toggle to enable or disable all non-essential notifications at once
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleMasterToggle(!notificationsEnabled)}
                className={[
                  'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black',
                  notificationsEnabled ? 'bg-purple-500' : 'bg-gray-600',
                ].join(' ')}
                aria-label={`Notifications ${notificationsEnabled ? 'enabled' : 'disabled'}`}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>

          {/* Email Frequency */}
          <div>
            <label htmlFor="email_frequency" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Email Frequency
            </label>
            <select
              id="email_frequency"
              {...register('email_frequency')}
              onChange={(e) => setValue('email_frequency', e.target.value, { shouldDirty: true })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 [data-theme='light']:bg-black/10 border border-white/20 [data-theme='light']:border-black/30 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="instant">Instant - Receive emails immediately</option>
              <option value="daily">Daily Digest - One email per day</option>
              <option value="weekly">Weekly Summary - One email per week</option>
            </select>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Choose how often you receive email notifications
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Social Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-medium text-[var(--foreground)]">Social Notifications</h3>
            </div>

            <NotificationToggle
              id="friend_requests"
              label="Friend Requests"
              description="Get notified when someone sends you a friend request"
              iconType="friend_request"
              inAppEnabled={watch('friend_requests_inapp')}
              emailEnabled={watch('friend_requests_email')}
              onInAppChange={(value) => setValue('friend_requests_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('friend_requests_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />

            <NotificationToggle
              id="new_followers"
              label="New Followers"
              description="Get notified when someone follows you"
              iconType="follower"
              inAppEnabled={watch('new_followers_inapp')}
              emailEnabled={watch('new_followers_email')}
              onInAppChange={(value) => setValue('new_followers_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('new_followers_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />

            <NotificationToggle
              id="comments"
              label="Comments & Reactions"
              description="Get notified when someone comments on or reacts to your content"
              iconType="comment"
              inAppEnabled={watch('comments_inapp')}
              emailEnabled={watch('comments_email')}
              onInAppChange={(value) => setValue('comments_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('comments_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Playlist Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Music className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-medium text-[var(--foreground)]">Playlist Notifications</h3>
            </div>

            <NotificationToggle
              id="playlist_invites"
              label="Playlist Invites"
              description="Get notified when someone invites you to collaborate on a playlist"
              iconType="playlist"
              inAppEnabled={watch('playlist_invites_inapp')}
              emailEnabled={watch('playlist_invites_email')}
              onInAppChange={(value) => setValue('playlist_invites_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('playlist_invites_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />

            <NotificationToggle
              id="playlist_updates"
              label="Group Playlist Updates"
              description="Get notified when collaborators add or remove songs from shared playlists"
              iconType="playlist"
              inAppEnabled={watch('playlist_updates_inapp')}
              emailEnabled={watch('playlist_updates_email')}
              onInAppChange={(value) => setValue('playlist_updates_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('playlist_updates_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* System Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-medium text-[var(--foreground)]">System Notifications</h3>
            </div>

            <NotificationToggle
              id="song_of_day"
              label="Song of the Day from Friends"
              description="Get notified when your friends share their Song of the Day"
              iconType="song"
              inAppEnabled={watch('song_of_day_inapp')}
              emailEnabled={watch('song_of_day_email')}
              onInAppChange={(value) => setValue('song_of_day_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('song_of_day_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />

            <NotificationToggle
              id="system_announcements"
              label="System Announcements"
              description="Important updates about Vybe features and changes"
              iconType="announcement"
              inAppEnabled={watch('system_announcements_inapp')}
              emailEnabled={watch('system_announcements_email')}
              onInAppChange={(value) => setValue('system_announcements_inapp', value, { shouldDirty: true })}
              onEmailChange={(value) => setValue('system_announcements_email', value, { shouldDirty: true })}
              disabled={!notificationsEnabled}
            />

            <NotificationToggle
              id="security_alerts"
              label="Security Alerts"
              description="Critical security notifications (password changes, login from new devices, etc.)"
              iconType="security"
              inAppEnabled={watch('security_alerts_inapp')}
              emailEnabled={watch('security_alerts_email')}
              onInAppChange={(value) => setValue('security_alerts_inapp', true, { shouldDirty: true })}
              onEmailChange={(value) => setValue('security_alerts_email', true, { shouldDirty: true })}
              disabled={true}
              required={true}
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 mt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-300 font-medium mb-1">Notification Preferences Explained</p>
                <p className="text-xs text-blue-400/80">
                  You can customize how and when you receive notifications. In-app notifications appear in the 
                  Vybe app, while email notifications are sent to your registered email address. Security alerts 
                  cannot be disabled to ensure account safety.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden form fields for React Hook Form */}
        <input type="hidden" {...register('notifications_enabled')} />
        <input type="hidden" {...register('friend_requests_inapp')} />
        <input type="hidden" {...register('friend_requests_email')} />
        <input type="hidden" {...register('new_followers_inapp')} />
        <input type="hidden" {...register('new_followers_email')} />
        <input type="hidden" {...register('comments_inapp')} />
        <input type="hidden" {...register('comments_email')} />
        <input type="hidden" {...register('playlist_invites_inapp')} />
        <input type="hidden" {...register('playlist_invites_email')} />
        <input type="hidden" {...register('playlist_updates_inapp')} />
        <input type="hidden" {...register('playlist_updates_email')} />
        <input type="hidden" {...register('song_of_day_inapp')} />
        <input type="hidden" {...register('song_of_day_email')} />
        <input type="hidden" {...register('system_announcements_inapp')} />
        <input type="hidden" {...register('system_announcements_email')} />
        <input type="hidden" {...register('security_alerts_inapp')} />
        <input type="hidden" {...register('security_alerts_email')} />
      </form>
    </div>
  );
}

// Outer component that wraps content with SettingsPageWrapper
export default function NotificationSettingsPage() {
  return (
    <SettingsPageWrapper>
      <NotificationSettingsContent />
    </SettingsPageWrapper>
  );
}
