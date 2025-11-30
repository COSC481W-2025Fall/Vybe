'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Info, Globe, Users, Lock, Eye, EyeOff, Search, Rss } from 'lucide-react';
import SettingsPageWrapper, { useSettingsContext } from '@/components/SettingsPageWrapper';
import { PrivacyToggle, PrivacyRadioGroup } from '@/components/PrivacyToggle';
import { privacySchema, getDefaultPrivacySettings } from '@/lib/schemas/privacySchema';
import { usePrivacySettings, usePrivacySettingsUpdate } from '@/hooks/usePrivacySettings';

// Inner component that uses the context (must be inside SettingsPageWrapper)
function PrivacySettingsContent() {
  const { setHasUnsavedChanges, setFormSubmitHandler, setFormResetHandler } = useSettingsContext();
  
  // Fetch privacy settings using TanStack Query
  const { data: privacyData, isLoading: loading, error: privacyError } = usePrivacySettings();
  
  // Privacy settings update mutation hook
  const privacyUpdate = usePrivacySettingsUpdate();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(privacySchema),
    defaultValues: getDefaultPrivacySettings(),
  });

  // Watch all form values
  const profileVisibility = watch('profile_visibility');
  const playlistVisibility = watch('playlist_visibility');
  const listeningActivityVisible = watch('listening_activity_visible');
  const songOfDayVisibility = watch('song_of_day_visibility');
  const friendRequestSetting = watch('friend_request_setting');
  const searchable = watch('searchable');
  const activityFeedVisible = watch('activity_feed_visible');

  // Store original form values for cancel
  const [originalValues, setOriginalValues] = useState(null);

  // Update unsaved changes indicator when form is dirty
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  // Update form when privacy data loads
  useEffect(() => {
    if (privacyData) {
      // Set form values
      const formValues = {
        profile_visibility: privacyData.profile_visibility || 'public',
        playlist_visibility: privacyData.playlist_visibility || 'public',
        listening_activity_visible: privacyData.listening_activity_visible ?? true,
        song_of_day_visibility: privacyData.song_of_day_visibility || 'public',
        friend_request_setting: privacyData.friend_request_setting || 'everyone',
        searchable: privacyData.searchable ?? true,
        activity_feed_visible: privacyData.activity_feed_visible ?? true,
      };
      
      setValue('profile_visibility', formValues.profile_visibility);
      setValue('playlist_visibility', formValues.playlist_visibility);
      setValue('listening_activity_visible', formValues.listening_activity_visible);
      setValue('song_of_day_visibility', formValues.song_of_day_visibility);
      setValue('friend_request_setting', formValues.friend_request_setting);
      setValue('searchable', formValues.searchable);
      setValue('activity_feed_visible', formValues.activity_feed_visible);
      
      // Store original values for cancel
      setOriginalValues(formValues);
    }
  }, [privacyData, setValue]);

  // Form submission handler using the mutation hook
  const onSubmit = async (data) => {
    try {
      // Use the mutation hook to update privacy settings
      const updatedPrivacy = await privacyUpdate.mutateAsync(data);
      
      // Privacy data will be updated via cache invalidation
      // Update form values with response data
      const formValues = {
        profile_visibility: updatedPrivacy.profile_visibility || 'public',
        playlist_visibility: updatedPrivacy.playlist_visibility || 'public',
        listening_activity_visible: updatedPrivacy.listening_activity_visible ?? true,
        song_of_day_visibility: updatedPrivacy.song_of_day_visibility || 'public',
        friend_request_setting: updatedPrivacy.friend_request_setting || 'everyone',
        searchable: updatedPrivacy.searchable ?? true,
        activity_feed_visible: updatedPrivacy.activity_feed_visible ?? true,
      };
      
      reset(formValues);
      setOriginalValues(formValues);
      setHasUnsavedChanges(false);
    } catch (error) {
      // Error is handled by the mutation hook (toast notification)
      // Re-throw to allow form to handle error state if needed
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

  if (loading) {
    return (
      <>
        <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Privacy</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Control who can see your activity and playlists
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

  if (privacyError) {
    return (
      <>
        <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Privacy</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Control who can see your activity and playlists
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 w-full">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-red-400">Error loading privacy settings: {privacyError.message}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Privacy</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Control who can see your activity and playlists
            </p>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 w-full">
        <div className="space-y-8 w-full">
          {/* Profile Visibility */}
          <div>
            <PrivacyRadioGroup
              name="profile_visibility"
              label="Profile Visibility"
              description="Control who can view your profile information"
              value={profileVisibility}
              onChange={(value) => setValue('profile_visibility', value, { shouldDirty: true })}
              requireConfirmation={true}
              options={[
                {
                  value: 'public',
                  label: 'Public',
                  description: 'Anyone can view your profile',
                  icon: 'Globe',
                },
                {
                  value: 'friends',
                  label: 'Friends Only',
                  description: 'Only your friends can view your profile',
                  icon: 'Users',
                },
                {
                  value: 'private',
                  label: 'Private',
                  description: 'Only you can view your profile',
                  icon: 'Lock',
                },
              ]}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Playlist Visibility */}
          <div>
            <PrivacyRadioGroup
              name="playlist_visibility"
              label="Playlist Visibility"
              description="Control who can see and access your playlists"
              value={playlistVisibility}
              onChange={(value) => setValue('playlist_visibility', value, { shouldDirty: true })}
              requireConfirmation={true}
              options={[
                {
                  value: 'public',
                  label: 'Public',
                  description: 'Anyone can view and follow your playlists',
                  icon: 'Globe',
                },
                {
                  value: 'friends',
                  label: 'Friends Only',
                  description: 'Only your friends can view your playlists',
                  icon: 'Users',
                },
                {
                  value: 'private',
                  label: 'Private',
                  description: 'Only you can view your playlists',
                  icon: 'Lock',
                },
              ]}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Listening Activity */}
          <div>
            <PrivacyToggle
              id="listening_activity_visible"
              label="Listening Activity"
              description="Show what you're currently listening to on your profile"
              checked={listeningActivityVisible}
              onChange={(checked) => setValue('listening_activity_visible', checked, { shouldDirty: true })}
              requireConfirmation={true}
              confirmationTitle="Hide Listening Activity?"
              confirmationMessage="This will hide what you're currently listening to from your profile. Are you sure you want to continue?"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Song of the Day Visibility */}
          <div>
            <PrivacyRadioGroup
              name="song_of_day_visibility"
              label="Song of the Day Visibility"
              description="Control who can see your Song of the Day"
              value={songOfDayVisibility}
              onChange={(value) => setValue('song_of_day_visibility', value, { shouldDirty: true })}
              requireConfirmation={true}
              options={[
                {
                  value: 'public',
                  label: 'Public',
                  description: 'Everyone can see your Song of the Day',
                  icon: 'Globe',
                },
                {
                  value: 'friends',
                  label: 'Friends Only',
                  description: 'Only your friends can see your Song of the Day',
                  icon: 'Users',
                },
                {
                  value: 'private',
                  label: 'Private',
                  description: 'Only you can see your Song of the Day',
                  icon: 'Lock',
                },
              ]}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Friend Request Settings */}
          <div>
            <PrivacyRadioGroup
              name="friend_request_setting"
              label="Who Can Send You Friend Requests"
              description="Control who can send you friend requests"
              value={friendRequestSetting}
              onChange={(value) => setValue('friend_request_setting', value, { shouldDirty: true })}
              requireConfirmation={true}
              options={[
                {
                  value: 'everyone',
                  label: 'Everyone',
                  description: 'Anyone can send you friend requests',
                  icon: 'Globe',
                },
                {
                  value: 'friends_of_friends',
                  label: 'Friends of Friends',
                  description: 'Only people who are friends with your friends can send requests',
                  icon: 'Users',
                },
                {
                  value: 'nobody',
                  label: 'Nobody',
                  description: 'No one can send you friend requests',
                  icon: 'Lock',
                },
              ]}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Search Visibility */}
          <div>
            <PrivacyToggle
              id="searchable"
              label="Appear in Search Results"
              description="Allow others to find you through search"
              checked={searchable}
              onChange={(checked) => setValue('searchable', checked, { shouldDirty: true })}
              requireConfirmation={true}
              confirmationTitle="Remove from Search Results?"
              confirmationMessage="This will prevent others from finding you through search. Are you sure you want to continue?"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Activity Feed Visibility */}
          <div>
            <PrivacyToggle
              id="activity_feed_visible"
              label="Activity Feed Visibility"
              description="Show your recent activity (playlist creates, song shares, etc.) in your activity feed"
              checked={activityFeedVisible}
              onChange={(checked) => setValue('activity_feed_visible', checked, { shouldDirty: true })}
              requireConfirmation={true}
              confirmationTitle="Hide Activity Feed?"
              confirmationMessage="This will hide your recent activity from your activity feed. Are you sure you want to continue?"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 mt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-300 font-medium mb-1">Privacy Settings Explained</p>
                <p className="text-xs text-blue-400/80">
                  Your privacy settings control what information is visible to others. These settings help you 
                  maintain control over your personal data and listening habits. You can change these settings 
                  at any time, and changes take effect immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden form fields for React Hook Form */}
        <input type="hidden" {...register('profile_visibility')} />
        <input type="hidden" {...register('playlist_visibility')} />
        <input type="hidden" {...register('listening_activity_visible')} />
        <input type="hidden" {...register('song_of_day_visibility')} />
        <input type="hidden" {...register('friend_request_setting')} />
        <input type="hidden" {...register('searchable')} />
        <input type="hidden" {...register('activity_feed_visible')} />
      </form>
    </div>
  );
}

// Outer component that wraps content with SettingsPageWrapper
export default function PrivacySettingsPage() {
  return (
    <SettingsPageWrapper>
      <PrivacySettingsContent />
    </SettingsPageWrapper>
  );
}
