'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

/**
 * Fetch user notification preferences
 * 
 * @returns {Object} Query object with notification preferences, loading, and error states
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/notifications');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch notification preferences');
      }
      return await response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Custom hook for notification preferences updates using TanStack Query
 * 
 * Features:
 * - Optimistic updates
 * - Cache invalidation
 * - Loading and error states
 * - Success/error notifications
 * 
 * @returns {Object} Mutation object with mutate function and state
 */
export function useNotificationPreferencesUpdate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (notificationData) => {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update notification preferences');
      }

      return response.json();
    },
    onMutate: async (newNotificationPreferences) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['notificationPreferences'] });

      // Snapshot the previous value
      const previousNotificationPreferences = queryClient.getQueryData(['notificationPreferences']);

      // Optimistically update to the new value
      queryClient.setQueryData(['notificationPreferences'], (old) => ({ ...old, ...newNotificationPreferences }));

      return { previousNotificationPreferences };
    },
    onError: (err, newNotificationPreferences, context) => {
      // Rollback to the previous value on error
      if (context?.previousNotificationPreferences) {
        queryClient.setQueryData(['notificationPreferences'], context.previousNotificationPreferences);
      }
      
      // Show error notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            message: err.message || 'Failed to update notification preferences',
          },
        }));
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(['notificationPreferences'], data);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      
      // Show success notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: data.message || 'Notification preferences updated successfully!',
          },
        }));
      }
    },
    onSettled: () => {
      // Ensure refetch happens after mutation is settled
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  return mutation;
}

