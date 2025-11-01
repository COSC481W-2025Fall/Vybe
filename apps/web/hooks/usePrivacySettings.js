'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

/**
 * Fetch user privacy settings
 * 
 * @returns {Object} Query object with privacy settings, loading, and error states
 */
export function usePrivacySettings() {
  return useQuery({
    queryKey: ['privacy'],
    queryFn: async () => {
      const response = await fetch('/api/user/privacy');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch privacy settings');
      }
      return await response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Custom hook for privacy settings updates using TanStack Query
 * 
 * Features:
 * - Optimistic updates
 * - Cache invalidation
 * - Loading and error states
 * - Success/error notifications
 * 
 * @returns {Object} Mutation object with mutate function and state
 */
export function usePrivacySettingsUpdate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (privacyData) => {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(privacyData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update privacy settings');
      }

      return response.json();
    },
    onMutate: async (newPrivacySettings) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['privacy'] });

      // Snapshot the previous value
      const previousPrivacySettings = queryClient.getQueryData(['privacy']);

      // Optimistically update to the new value
      queryClient.setQueryData(['privacy'], (old) => ({ ...old, ...newPrivacySettings }));

      return { previousPrivacySettings };
    },
    onError: (err, newPrivacySettings, context) => {
      // Rollback to the previous value on error
      if (context?.previousPrivacySettings) {
        queryClient.setQueryData(['privacy'], context.previousPrivacySettings);
      }
      
      // Show error notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            message: err.message || 'Failed to update privacy settings',
          },
        }));
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(['privacy'], data);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['privacy'] });
      
      // Show success notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: data.message || 'Privacy settings updated successfully!',
          },
        }));
      }
    },
    onSettled: () => {
      // Ensure refetch happens after mutation is settled
      queryClient.invalidateQueries({ queryKey: ['privacy'] });
    },
  });

  return mutation;
}

