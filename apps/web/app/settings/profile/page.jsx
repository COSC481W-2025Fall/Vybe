'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Music,
  ExternalLink,
} from 'lucide-react';
import SettingsPageWrapper, { useSettingsContext } from '@/components/SettingsPageWrapper';
import { profileSchema } from '@/lib/schemas/profileSchema';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useProfileUpdate, useProfile } from '@/hooks/useProfileUpdate';

const LOCAL_STORAGE_KEY = 'vybe_profile_local';

function ProfileSettingsContent() {
  const {
    setHasUnsavedChanges,
    setFormSubmitHandler,
    setFormResetHandler,
  } = useSettingsContext();

  const {
    data: profileData,
    isLoading: loading,
    error: profileError,
  } = useProfile();
  const profileUpdate = useProfileUpdate();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      bio: '',
      profile_picture_url: '',
    },
  });

  const displayName = watch('display_name');
  const bio = watch('bio');

  // Track unsaved changes (drives the yellow bar + disabled Save button)
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  const [initialized, setInitialized] = useState(false);

  // Initialize from Supabase profile, then overlay localStorage draft if present
  useEffect(() => {
    if (initialized) return;

    let fromLocal =  null;
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          fromLocal = JSON.parse(stored);
        } catch (e) {
          console.warn('[Profile] Could not parse localStorage profile', e);
        }
      }
    }

    const fromBackend = profileData
      ? {
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          profile_picture_url: profileData.profile_picture_url || '',
        }
      : null;

    const formValues =
      fromLocal ||
      fromBackend || {
        display_name: '',
        bio: '',
        profile_picture_url: '',
      };

    reset(formValues);
    setInitialized(true);
  }, [profileData, reset, initialized]);

  // Submit handler: Save to Supabase (source of truth) + keep local draft in sync if needed
  const onSubmit = async (data) => {
    const localFormValues = {
      display_name: data.display_name || '',
      bio: data.bio || '',
      profile_picture_url: data.profile_picture_url || '',
    };

    // 1) Try Supabase backend first (source of truth)
    try {
      await profileUpdate.mutateAsync(localFormValues);

      // On success, either clear or sync local draft.
      // If you want Supabase to be the only truth, clear localStorage:
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.warn(
        '[Profile] Backend update failed. Keeping local draft only.',
        error
      );
      // If backend fails, keep local draft so user doesn't lose data
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(localFormValues)
        );
      }
    }

    // Reset form state to saved values
    reset(localFormValues);
    setHasUnsavedChanges(false);
  };

  // Hook this page’s submit/reset into the Settings wrapper buttons
  useEffect(() => {
    if (!setFormSubmitHandler || !setFormResetHandler) return;

    // Wrapper "Save Changes" will call this
    setFormSubmitHandler(() => handleSubmit(onSubmit));

    // Wrapper "Cancel" will call this
    setFormResetHandler(() => () => {
      // Revert to last known profileData (Supabase) or empty
      const fromBackend = profileData
        ? {
            display_name: profileData.display_name || '',
            bio: profileData.bio || '',
            profile_picture_url: profileData.profile_picture_url || '',
          }
        : {
            display_name: '',
            bio: '',
            profile_picture_url: '',
          };

      reset(fromBackend);
      setHasUnsavedChanges(false);
    });

    return () => {
      setFormSubmitHandler(null);
      setFormResetHandler(null);
    };
  }, [
    handleSubmit,
    onSubmit,
    profileData,
    reset,
    setFormResetHandler,
    setFormSubmitHandler,
    setHasUnsavedChanges,
  ]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (!initialized && loading && !profileData) {
    return (
      <>
        <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Profile</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Manage your display name, bio, and profile picture
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (!initialized && profileError && !profileData) {
    return (
      <>
        <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Profile</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Manage your display name, bio, and profile picture
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-red-400">
              Error loading profile: {profileError.message}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Profile</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage your display name, bio, and profile picture
            </p>
          </div>
        </div>
      </div>

      {/* Content – wrapper's Save button will trigger handleSubmit(onSubmit) */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 w-full flex-1">
        <div className="space-y-6 w-full">
          {/* Display Name */}
          <div>
            <label
              htmlFor="display_name"
              className="block text-sm font-medium text-white mb-2"
            >
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              id="display_name"
              type="text"
              {...register('display_name')}
              maxLength={50}
              className={[
                'w-full px-4 py-2.5 rounded-lg bg-white/5 border',
                'text-white placeholder-gray-500 text-base sm:text-sm',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                'touch-manipulation',
                errors.display_name
                  ? 'border-red-500/50'
                  : 'border-white/20 focus:border-purple-500/50',
              ].join(' ')}
              placeholder="Enter your display name"
            />
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {errors.display_name ? (
                  <span className="text-red-400">
                    {errors.display_name.message}
                  </span>
                ) : (
                  <span>2-50 characters, letters, numbers, and spaces only</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {displayName?.length || 0}/50
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-white mb-2"
            >
              Bio
            </label>
            <textarea
              id="bio"
              {...register('bio')}
              maxLength={200}
              rows={4}
              className={[
                'w-full px-4 py-2.5 rounded-lg bg-white/5 border resize-none',
                'text-white placeholder-gray-500 text-base sm:text-sm',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                'touch-manipulation',
                errors.bio
                  ? 'border-red-500/50'
                  : 'border-white/20 focus:border-purple-500/50',
              ].join(' ')}
              placeholder="Tell us about yourself..."
            />
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {errors.bio ? (
                  <span className="text-red-400">{errors.bio.message}</span>
                ) : (
                  <span>
                    Optional. Share a little about yourself with the community.
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {bio?.length || 0}/200
              </div>
            </div>
          </div>

          {/* Profile Picture */}
          <ProfilePictureUpload
            currentImageUrl={watch('profile_picture_url') || null}
            onImageChange={(url) => {
              setValue('profile_picture_url', url, { shouldDirty: true });
            }}
            onRemove={() => {
              setValue('profile_picture_url', '', { shouldDirty: true });
            }}
          />

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Account Info (read-only) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Account Information</h3>

            <div className="flex items-start gap-3">
              <Music className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-1">Logged in with</div>
                <div className="flex items-center gap-2">
                  <span className="text-white">
                    {profileData?.auth_provider_display || 'Email'}
                  </span>
                  {profileData?.provider_account_name && (
                    <span className="text-gray-400 text-sm">
                      ({profileData.provider_account_name})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-1">Email</div>
                <div className="flex items-center gap-2">
                  <span className="text-white">
                    {profileData?.email || 'N/A'}
                  </span>
                  {profileData?.email_verified ? (
                    <CheckCircle2
                      className="h-4 w-4 text-green-400"
                      title="Verified"
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4 text-yellow-400"
                      title="Not verified"
                    />
                  )}
                </div>
              </div>
            </div>

            {profileData?.username && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-400 mb-1">Username</div>
                  <span className="text-white">{profileData.username}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-1">Member Since</div>
                <span className="text-white">
                  {formatDate(profileData?.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Connected Accounts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Connected Accounts</h3>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-sm font-medium text-white">Spotify</div>
                  <div className="text-xs text-gray-400">
                    {profileData?.spotify_connected
                      ? profileData?.spotify_account?.display_name ||
                        profileData?.spotify_account?.id ||
                        'Connected'
                      : 'Not connected'}
                  </div>
                </div>
              </div>
              {profileData?.spotify_connected ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  Connect <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium text-white">YouTube</div>
                  <div className="text-xs text-gray-400">
                    {profileData?.youtube_connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              {profileData?.youtube_connected ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  Connect <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <SettingsPageWrapper>
      <ProfileSettingsContent />
    </SettingsPageWrapper>
  );
}
