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
  UserPlus,
  Users,
  Trash2,
  Mail as MailIcon,
} from 'lucide-react';
import SettingsPageWrapper, { useSettingsContext } from '@/components/SettingsPageWrapper';
import { profileSchema } from '@/lib/schemas/profileSchema';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useProfile } from '@/hooks/useProfileUpdate';
import AddFriendsModal from '@/components/AddFriendsModal';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import { useQueryClient } from '@tanstack/react-query';
import { useGroups } from '@/hooks/useGroups';

function ProfileSettingsContent() {
  const {
    setHasUnsavedChanges,
    setFormSubmitHandler,
    setFormResetHandler,
  } = useSettingsContext();

  const queryClient = useQueryClient();
  
  const {
    data: profileData,
    isLoading: loading,
    error: profileError,
  } = useProfile();

  // Get groups count using the same hook as My Groups page
  const { groups, loading: groupsLoading } = useGroups();

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

  // Friends management state
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Track unsaved changes (drives yellow bar + Save button state)
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  const [initialized, setInitialized] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize from Supabase profile only
  useEffect(() => {
    if (!profileData) return; // wait until we actually have data
    if (justSaved) return; // Don't overwrite form right after saving
    if (isSubmitting) return; // Don't overwrite form while submitting

    const formValues = {
      display_name: profileData.display_name || '',
      bio: profileData.bio || '',
      profile_picture_url: profileData.profile_picture_url || '',
      is_public: profileData.is_public ?? false,
    };

    // Only reset if form is not dirty (to avoid overwriting user's unsaved changes)
    // or if this is the first initialization
    if (!isDirty || !initialized) {
      reset(formValues);
      setInitialized(true);
    }
  }, [profileData, reset, initialized, isDirty, justSaved, isSubmitting]);

  // Load friends list
  useEffect(() => {
    loadFriends();
    loadPendingRequestsCount();
  }, []);

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setFriendsLoading(false);
    }
  };

  const loadPendingRequestsCount = async () => {
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      if (data.success) {
        const receivedCount = data.received?.length || 0;
        setPendingRequestsCount(receivedCount);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setFriends(prev => prev.filter(f => f.id !== friendId));
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: {
                type: 'success',
                message: 'Friend removed successfully',
              },
            })
          );
        }
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: {
                type: 'error',
                message: data.error || 'Failed to remove friend',
              },
            })
          );
        }
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              type: 'error',
              message: 'Network error. Please try again.',
            },
          })
        );
      }
    }
  };

  // Submit handler: update Supabase users table directly
  const onSubmit = async (data) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('[Profile] Already submitting, ignoring duplicate request');
      return;
    }

    // Trim and validate display_name
    const displayName = data.display_name?.trim() || '';
    if (displayName.length < 2) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              type: 'error',
              message: 'Display name must be at least 2 characters',
            },
          })
        );
      }
      return;
    }

    const payload = {
      display_name: displayName,
      bio: data.bio?.trim() || null,
      profile_picture_url: data.profile_picture_url?.trim() || null,
      is_public: Boolean(data.is_public ?? false),
    };

    setIsSubmitting(true);
    console.log('[Profile] Starting profile update...', payload);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Clone the response before reading to avoid consuming it
        const clonedRes = res.clone();
        
        // Log details so we can see what Supabase complained about
        let errorBody = null;
        let errorText = null;
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorBody = await clonedRes.json();
          } else {
            errorText = await clonedRes.text();
          }
        } catch (e) {
          console.error('[Profile] Error parsing error response:', e);
          try {
            // Try reading from original response as text
            const textRes = res.clone();
            errorText = await textRes.text();
          } catch (e2) {
            console.error('[Profile] Could not read error response as text:', e2);
          }
        }

        console.error(
          '[Profile] Failed to update profile in Supabase. Status:',
          res.status,
          'Status Text:',
          res.statusText,
          'Body:',
          errorBody || errorText || 'No error body',
          'Headers:',
          Object.fromEntries(res.headers.entries())
        );

        const errorMessage = 
          (errorBody && errorBody.error) ||
          (errorBody && errorBody.details) ||
          errorText ||
          `Failed to save profile (${res.status} ${res.statusText}). Please try again.`;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: {
                type: 'error',
                message: errorMessage,
              },
            })
          );
        }
        return;
      }

      // Mark that we just saved to prevent useEffect from overwriting
      setJustSaved(true);
      
      // Get the response data (may include updated profile)
      const responseData = await res.json();
      
      // Update the cache immediately with the response data
      if (responseData.profile) {
        console.log('[Profile] Updating cache directly with response data:', responseData.profile);
        queryClient.setQueryData(['profile'], responseData.profile);
      }
      
      // Also invalidate to trigger any other components using this data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Force a refetch to ensure we have the absolute latest from the database
      const refetchResults = await queryClient.refetchQueries({ 
        queryKey: ['profile'],
        type: 'active' // Only refetch active queries
      });
      
      // Use the profile from response if available, otherwise use refetched data
      let freshProfileData = responseData.profile;
      
      if (!freshProfileData && refetchResults && refetchResults.length > 0) {
        const queryResult = refetchResults[0];
        freshProfileData = queryResult?.data;
        console.log('[Profile] Got fresh data from refetch:', freshProfileData);
      }
      
      // Update form with fresh data from database
      if (freshProfileData) {
        const formData = {
          display_name: freshProfileData.display_name || '',
          bio: freshProfileData.bio || '',
          profile_picture_url: freshProfileData.profile_picture_url || '',
          is_public: freshProfileData.is_public ?? false,
        };
        console.log('[Profile] Resetting form with fresh data:', formData);
        reset(formData);
      } else {
        // Fallback to payload if we couldn't get fresh data
        console.log('[Profile] Using payload as fallback:', payload);
        reset(payload);
      }
      
      setHasUnsavedChanges(false);
      
      // Allow useEffect to run again after a delay (gives time for the form to update)
      setTimeout(() => {
        setJustSaved(false);
        setIsSubmitting(false);
      }, 1000); // Increased delay to prevent race conditions

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
    } catch (error) {
      console.error('[Profile] Network/unknown error updating profile:', error);
      setIsSubmitting(false);
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
    } finally {
      // Ensure submitting state is cleared even if there's an early return
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
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
                Manage your display name, bio, profile picture, and friends here
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
              Manage your display name, bio, profile picture, and friends here
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
            Manage your display name, bio, profile picture, and friends here
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

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-[var(--muted-foreground)] mb-1">Groups</div>
                <span className="text-[var(--foreground)]">
                  {groupsLoading ? 'Loading...' : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 [data-theme='light']:border-black/10"></div>

          {/* Friends Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[var(--foreground)]">Friends</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFriendRequestsModal(true)}
                  className="relative flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors border border-purple-500/30"
                >
                  <MailIcon className="h-4 w-4" />
                  Requests
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFriendsModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors border border-blue-500/30"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Friends
                </button>
              </div>
            </div>

            {friendsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/10 [data-theme='light']:border-black/20 bg-white/5 [data-theme='light']:bg-black/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {friend.name?.charAt(0)?.toUpperCase() || friend.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-[var(--foreground)] font-medium">{friend.name || friend.username}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">@{friend.username}</p>
                        {friend.bio && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2 opacity-80">
                            {friend.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="p-2 hover:bg-red-500/20 active:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                      title="Remove friend"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-lg border border-white/10 [data-theme='light']:border-black/20 bg-white/5 [data-theme='light']:bg-black/5">
                <Users className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-[var(--muted-foreground)] mb-2">No friends yet</p>
                <button
                  type="button"
                  onClick={() => setShowAddFriendsModal(true)}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Add your first friend
                </button>
              </div>
            )}
          </div>

        </div>
      </form>

      {/* Modals */}
      {showAddFriendsModal && (
        <AddFriendsModal
          onClose={() => {
            setShowAddFriendsModal(false);
            loadFriends(); // Refresh friends list
            loadPendingRequestsCount(); // Refresh request count
          }}
        />
      )}

      {showFriendRequestsModal && (
        <FriendRequestsModal
          onClose={() => {
            setShowFriendRequestsModal(false);
            loadFriends(); // Refresh friends list
            loadPendingRequestsCount(); // Refresh request count
          }}
          onRefresh={() => {
            // Refresh both pending count and friends when an action occurs in the modal
            loadPendingRequestsCount();
            loadFriends();
          }}
        />
      )}
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
