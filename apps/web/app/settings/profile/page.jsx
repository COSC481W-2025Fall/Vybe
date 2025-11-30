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
import { useProfile } from '@/hooks/useProfileUpdate';

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
      is_public: false, // default private
    },
  });

  const displayName = watch('display_name');
  const bio = watch('bio');

  // Track unsaved changes (drives yellow bar + Save button state)
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  const [initialized, setInitialized] = useState(false);

  // Initialize from Supabase profile only
  useEffect(() => {
    if (initialized) return;
    if (!profileData) return; // wait until we actually have data

    const formValues = {
      display_name: profileData.display_name || '',
      bio: profileData.bio || '',
      profile_picture_url: profileData.profile_picture_url || '',
      is_public: profileData.is_public ?? false,
    };

    reset(formValues);
    setInitialized(true);
  }, [profileData, reset, initialized]);

  // Submit handler: update Supabase users table directly
  const onSubmit = async (data) => {
    const payload = {
      display_name: data.display_name || '',
      bio: data.bio || '',
      profile_picture_url: data.profile_picture_url || '',
      is_public: data.is_public ?? false,
    };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Log details so we can see what Supabase complained about
        let errorBody = null;
        try {
          errorBody = await res.json();
        } catch (e) {
          // ignore parse error
        }

        console.error(
          '[Profile] Failed to update profile in Supabase. Status:',
          res.status,
          'Body:',
          errorBody
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: {
                type: 'error',
                message:
                  (errorBody && errorBody.error) ||
                  'Failed to save profile. Please try again.',
              },
            })
          );
        }
        return;
      }

      // Success: Supabase is now the truth
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              type: 'success',
              message: 'Profile updated successfully!',
            },
          })
        );
      }

      // keep the form in sync with what we just saved
      reset(payload);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[Profile] Network/unknown error updating profile:', error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              type: 'error',
              message: 'Unable to reach server. Please try again later.',
            },
          })
        );
      }
    }
  };

  // Hook this page’s submit/reset into the Settings wrapper buttons
  useEffect(() => {
    if (!initialized) return;
    if (!setFormSubmitHandler || !setFormResetHandler) return;

    // Wrapper "Save Changes" button will call this
    setFormSubmitHandler(() => handleSubmit(onSubmit));

    // Wrapper "Cancel" button will call this
    setFormResetHandler(() => () => {
      const fromBackend = profileData
        ? {
            display_name: profileData.display_name || '',
            bio: profileData.bio || '',
            profile_picture_url: profileData.profile_picture_url || '',
            is_public: profileData.is_public ?? false,
          }
        : {
            display_name: '',
            bio: '',
            profile_picture_url: '',
            is_public: false,
          };

      reset(fromBackend);
      setHasUnsavedChanges(false);
    });

    return () => {
      setFormSubmitHandler(null);
      setFormResetHandler(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

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
        <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Profile</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
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
        <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Profile</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
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
      <div className="border-b border-white/10 [data-theme='light']:border-black/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 sm:px-6 py-4 w-full flex-shrink-0">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Profile</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
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
            <label htmlFor="display_name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              id="display_name"
              type="text"
              {...register('display_name')}
              maxLength={50}
              className={[
                'w-full px-4 py-2.5 rounded-lg bg-white/10 [data-theme="light"]:bg-gray-100 border backdrop-blur-[60px]',
                'text-[var(--foreground)] placeholder-[var(--muted-foreground)] text-base sm:text-sm',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                'touch-manipulation',
                errors.display_name
                  ? 'border-red-500/50'
                  : 'border-white/20 [data-theme="light"]:border-gray-300 focus:border-purple-500/50 [data-theme="light"]:focus:bg-gray-200',
              ].join(' ')}
              placeholder="Enter your display name"
            />
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-[var(--muted-foreground)]">
                {errors.display_name ? (
                  <span className="text-red-400">
                    {errors.display_name.message}
                  </span>
                ) : (
                  <span>2-50 characters, letters, numbers, and spaces only</span>
                )}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {displayName?.length || 0}/50
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              {...register('bio')}
              maxLength={200}
              rows={4}
              className={[
                'w-full px-4 py-2.5 rounded-lg bg-white/10 [data-theme="light"]:bg-gray-100 border resize-none backdrop-blur-[60px]',
                'text-[var(--foreground)] placeholder-[var(--muted-foreground)] text-base sm:text-sm',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
                'touch-manipulation',
                errors.bio
                  ? 'border-red-500/50'
                  : 'border-white/20 [data-theme="light"]:border-gray-300 focus:border-purple-500/50 [data-theme="light"]:focus:bg-gray-200',
              ].join(' ')}
              placeholder="Tell us about yourself..."
            />
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-[var(--muted-foreground)]">
                {errors.bio ? (
                  <span className="text-red-400">{errors.bio.message}</span>
                ) : (
                  <span>
                    Optional. Share a little about yourself with the community.
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {bio?.length || 0}/200
              </div>
            </div>
          </div>

          {/* Public / Private toggle */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Profile Visibility
              </label>
              <p className="text-xs text-gray-400">
                When public, other users can view your profile.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_public"
                type="checkbox"
                {...register('is_public')}
                className="h-4 w-4 rounded border-white/30 bg-transparent"
              />
              <label htmlFor="is_public" className="text-sm text-gray-200">
                Public profile
              </label>
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
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Account Info (read-only) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--foreground)]">Account Information</h3>

            <div className="flex items-start gap-3">
              <Music className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-[var(--muted-foreground)] mb-1">Logged in with</div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--foreground)]">
                    {profileData?.auth_provider_display || 'Email'}
                  </span>
                  {profileData?.provider_account_name && (
                    <span className="text-[var(--muted-foreground)] text-sm">
                      ({profileData.provider_account_name})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-[var(--muted-foreground)] mb-1">Email</div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--foreground)]">{profileData?.email || 'N/A'}</span>
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
                <User className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-[var(--muted-foreground)] mb-1">Username</div>
                  <span className="text-[var(--foreground)]">{profileData.username}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-[var(--muted-foreground)] mb-1">Member Since</div>
                <span className="text-[var(--foreground)]">{formatDate(profileData?.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Connected Accounts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--foreground)]">Connected Accounts</h3>

            {/* Spotify Connection */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 [data-theme='light']:border-black/20 bg-white/10 [data-theme='light']:bg-black/10">
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">Spotify</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
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

            {/* YouTube Connection */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 [data-theme='light']:border-black/20 bg-white/10 [data-theme='light']:bg-black/10">
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">YouTube</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
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
