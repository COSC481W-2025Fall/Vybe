'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getSettingsQueryOptions, invalidateOnUpdate } from '@/lib/cache/settingsCache';

/**
 * Fetch user profile data
 * 
 * Uses optimized cache settings:
 * - 5 minute stale time
 * - Fallback to stale cache if API fails
 * - Background refetch on window focus
 * 
 * @returns {Object} Query object with profile data, loading, and error states
 */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return await response.json();
    },
    ...getSettingsQueryOptions(),
  });
}

/**
 * Custom hook for profile updates using TanStack Query
 * 
 * Features:
 * - Optimistic updates
 * - Cache invalidation
 * - Loading and error states
 * - Success/error notifications
 * 
 * @returns {Object} Mutation object with mutate function and state
 */
export function useProfileUpdate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (profileData) => {
      // Prepare data for API
      const updateData = {
        display_name: profileData.display_name,
        bio: profileData.bio || null,
        profile_picture_url: profileData.profile_picture_url || null,
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle validation errors
        if (response.status === 400) {
          throw new Error(errorData.error || 'Validation failed');
        }
        
        throw new Error(errorData.error || 'Failed to update profile');
      }

      return await response.json();
    },
    
    // Optimistic update: update cache immediately
    onMutate: async (newProfileData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['profile'] });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(['profile']);

      // Optimistically update to the new value
      queryClient.setQueryData(['profile'], (old) => ({
        ...old,
        ...newProfileData,
      }));

      // Return context with the snapshotted value
      return { previousProfile };
    },
    
    // If mutation fails, rollback to previous value
    onError: (err, newProfileData, context) => {
      // Rollback the optimistic update
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile'], context.previousProfile);
      }
      
      // Show error notification
      if (typeof window !== 'undefined') {
        // Dispatch custom event for toast notification
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            message: err.message || 'Failed to update profile',
          },
        }));
      }
    },
    
    // On success, invalidate and refetch profile data
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(['profile'], data);
      
      // Invalidate cache on explicit update
      invalidateOnUpdate(queryClient, 'profile');
      
      // Show success notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: 'Profile updated successfully',
          },
        }));
      }
    },
    
    // Always refetch on success to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return mutation;
}

