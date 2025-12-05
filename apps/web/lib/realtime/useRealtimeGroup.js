'use client';

/**
 * Real-time Group Hook - Live updates for group data
 * 
 * Subscribes to:
 * - Group metadata changes
 * - Playlist additions/removals
 * - Song additions/removals
 * - Member changes
 * - Sort order changes
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRealtime } from './RealtimeProvider';

/**
 * Hook for real-time group updates
 * 
 * @param {string} groupId - Group ID to subscribe to
 * @param {Object} callbacks - Callback functions for different events
 * @param {Function} callbacks.onGroupUpdate - Called when group metadata changes
 * @param {Function} callbacks.onPlaylistChange - Called when playlists change
 * @param {Function} callbacks.onSongChange - Called when songs change
 * @param {Function} callbacks.onMemberChange - Called when members change
 */
export function useRealtimeGroup(groupId, callbacks = {}) {
  const { subscribe, isConnected, connectionState } = useRealtime();
  const callbacksRef = useRef(callbacks);
  
  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!groupId) return;

    const unsubscribers = [];

    // Subscribe to group metadata changes
    if (callbacksRef.current.onGroupUpdate) {
      const unsub = subscribe({
        table: 'groups',
        event: 'UPDATE',
        filter: `id=eq.${groupId}`,
        callback: (payload) => {
          callbacksRef.current.onGroupUpdate?.(payload.new, payload.old);
        },
        channelName: `group-${groupId}-meta`,
      });
      unsubscribers.push(unsub);
    }

    // Subscribe to playlist changes
    if (callbacksRef.current.onPlaylistChange) {
      const unsub = subscribe({
        table: 'group_playlists',
        event: '*',
        filter: `group_id=eq.${groupId}`,
        callback: (payload) => {
          callbacksRef.current.onPlaylistChange?.(payload.eventType, payload.new, payload.old);
        },
        channelName: `group-${groupId}-playlists`,
      });
      unsubscribers.push(unsub);
    }

    // Subscribe to song changes (across all playlists in group)
    if (callbacksRef.current.onSongChange) {
      const unsub = subscribe({
        table: 'playlist_songs',
        event: '*',
        // Note: We'll filter by playlist_id on the client side since we need to check group membership
        callback: (payload) => {
          // The callback will receive all playlist_songs changes
          // Parent component should filter by relevant playlist IDs
          callbacksRef.current.onSongChange?.(payload.eventType, payload.new, payload.old);
        },
        channelName: `group-${groupId}-songs`,
      });
      unsubscribers.push(unsub);
    }

    // Subscribe to member changes
    if (callbacksRef.current.onMemberChange) {
      const unsub = subscribe({
        table: 'group_members',
        event: '*',
        filter: `group_id=eq.${groupId}`,
        callback: (payload) => {
          callbacksRef.current.onMemberChange?.(payload.eventType, payload.new, payload.old);
        },
        channelName: `group-${groupId}-members`,
      });
      unsubscribers.push(unsub);
    }

    console.log(`[useRealtimeGroup] Subscribed to group ${groupId}`);

    return () => {
      unsubscribers.forEach(unsub => unsub());
      console.log(`[useRealtimeGroup] Unsubscribed from group ${groupId}`);
    };
  }, [groupId, subscribe]);

  return { isConnected, connectionState };
}

/**
 * Hook for real-time song of the day updates
 * 
 * @param {Function} onUpdate - Called when any friend's song of the day changes
 */
export function useRealtimeSongOfDay(onUpdate) {
  const { subscribe, isConnected } = useRealtime();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const unsub = subscribe({
      table: 'song_of_the_day',
      event: '*',
      callback: (payload) => {
        onUpdateRef.current?.(payload.eventType, payload.new, payload.old);
      },
      channelName: 'song-of-the-day-global',
    });

    return unsub;
  }, [subscribe]);

  return { isConnected };
}

/**
 * Hook for real-time friend activity
 * 
 * @param {string} userId - Current user ID
 * @param {Function} onFriendActivity - Called when friends have activity
 */
export function useRealtimeFriends(userId, onFriendActivity) {
  const { subscribe, isConnected } = useRealtime();
  const callbackRef = useRef(onFriendActivity);

  useEffect(() => {
    callbackRef.current = onFriendActivity;
  }, [onFriendActivity]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to friend requests
    const unsub1 = subscribe({
      table: 'friend_requests',
      event: '*',
      filter: `receiver_id=eq.${userId}`,
      callback: (payload) => {
        callbackRef.current?.('friend_request', payload.eventType, payload.new, payload.old);
      },
      channelName: `friends-${userId}-requests`,
    });

    // Subscribe to friendships
    const unsub2 = subscribe({
      table: 'friendships',
      event: '*',
      callback: (payload) => {
        // Check if current user is involved
        const isInvolved = payload.new?.user1_id === userId || 
                          payload.new?.user2_id === userId ||
                          payload.old?.user1_id === userId ||
                          payload.old?.user2_id === userId;
        if (isInvolved) {
          callbackRef.current?.('friendship', payload.eventType, payload.new, payload.old);
        }
      },
      channelName: `friends-${userId}-ships`,
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [userId, subscribe]);

  return { isConnected };
}

