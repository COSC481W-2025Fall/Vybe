'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import SettingsPageWrapper, { useSettingsContext } from '@/components/SettingsPageWrapper';
import { usePrivacySettings, usePrivacySettingsUpdate } from '@/hooks/usePrivacySettings';
import { PrivacyToggle, PrivacyRadioGroup } from '@/components/PrivacyToggle';

// Simplified schema for just the two fields we need
const privacyFormSchema = z.object({
  searchable: z.boolean(),
  song_of_day_visibility: z.enum(['public', 'friends', 'private']),
});

// Inner component that uses the context (must be inside SettingsPageWrapper)
function PrivacySettingsContent() {
  const { data: privacySettings, isLoading, error } = usePrivacySettings();
  const { mutate: updatePrivacy, isPending: isUpdating } = usePrivacySettingsUpdate();
  const { setHasUnsavedChanges, setFormSubmitHandler, setFormResetHandler } = useSettingsContext();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty, errors },
  } = useForm({
    resolver: zodResolver(privacyFormSchema),
    defaultValues: {
      searchable: true,
      song_of_day_visibility: 'public',
    },
  });

  // Load settings when available
  useEffect(() => {
    if (privacySettings) {
      reset({
        searchable: privacySettings.searchable ?? true,
        song_of_day_visibility: privacySettings.song_of_day_visibility || 'public',
      });
    }
  }, [privacySettings, reset]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  // Set form handlers for parent wrapper
  useEffect(() => {
    setFormSubmitHandler(() => handleSubmit(onSubmit));
    setFormResetHandler(() => reset());
  }, [handleSubmit, reset, setFormSubmitHandler, setFormResetHandler]);

  const onSubmit = async (data) => {
    updatePrivacy(data, {
      onSuccess: () => {
        reset(data, { keepValues: true });
      },
    });
  };

  const searchable = watch('searchable');
  const songOfDayVisibility = watch('song_of_day_visibility');

  const songOfDayOptions = [
    {
      value: 'public',
      label: 'Public',
      description: 'Everyone can see your song of the day',
      icon: 'Globe',
    },
    {
      value: 'friends',
      label: 'Friends Only',
      description: 'Only your friends can see your song of the day',
      icon: 'Users',
    },
    {
      value: 'private',
      label: 'Private',
      description: 'Only you can see your song of the day',
      icon: 'Lock',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading privacy settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading privacy settings. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-white mb-2">Privacy Settings</h2>
        <p className="text-sm text-gray-400">
          Control who can find you and see your song of the day
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 sm:p-6">
        {/* Find in Add Friends Section */}
        <div className="space-y-4">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-semibold text-white mb-1">Find in Add Friends</h3>
            <p className="text-sm text-gray-400">
              Control whether other users can find you when searching for friends
            </p>
          </div>

          <PrivacyToggle
            id="searchable"
            label="Allow others to find me when searching for friends"
            description="When enabled, you'll appear in friend search results. When disabled, only users who already know your username can find you."
            checked={searchable}
            onChange={(value) => setValue('searchable', value, { shouldDirty: true })}
            disabled={isUpdating}
          />
        </div>

        {/* Song of the Day Section */}
        <div className="space-y-4">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-semibold text-white mb-1">Song of the Day</h3>
            <p className="text-sm text-gray-400">
              Control who can see your daily song selection
            </p>
          </div>

          <PrivacyRadioGroup
            name="song_of_day_visibility"
            label="Song of the Day Visibility"
            description="Choose who can see your song of the day"
            options={songOfDayOptions}
            value={songOfDayVisibility}
            onChange={(value) => setValue('song_of_day_visibility', value, { shouldDirty: true })}
            disabled={isUpdating}
          />
        </div>
      </form>
    </div>
  );
}

// Wrapper component
export default function PrivacySettingsPage() {
  return (
    <SettingsPageWrapper>
      <PrivacySettingsContent />
    </SettingsPageWrapper>
  );
}

