'use client';

/**
 * Real-time Data Hooks
 * 
 * Provides live updates for various data types without full page reloads.
 * Each hook subscribes to relevant database changes and updates component state.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRealtime } from './RealtimeProvider';
import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  cacheUserGroups, 
  cacheUserFriends, 
  getCachedUserGroups,
  getCachedUserFriends 
} from '@/lib/cache/clientCache';

/**
 * Hook for real-time user groups updates
 * Subscribes to group_members changes for the current user
 * 
 * @param {string} userId - Current user ID
 * @param {Object} options - Options
 * @param {Function} options.onGroupAdded - Called when user joins a group
 * @param {Function} options.onGroupRemoved - Called when user leaves a group
 * @returns {Object} { groups, loading, error, refetch }
 */
export function useRealtimeGroups(userId, options = {}) {
  const { subscribe, isConnected } = useRealtime();
  const [groups, setGroups] = useState(() => getCachedUserGroups() || []);
  const [loading, setLoading] = useState(() => getCachedUserGroups() === null);
  const [error, setError] = useState(null);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Fetch groups from database
  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    
    try {
      const supabase = supabaseBrowser();
      
      // Get groups where user is owner
      const { data: ownedGroups, error: ownedError } = await supabase
        .from('groups')
        .select(`*, group_members(count), group_playlists(track_count)`)
        .eq('owner_id', userId);

      if (ownedError) throw ownedError;

      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`group_id, groups(*, group_members(count), group_playlists(track_count))`)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Calculate song counts
      const calculateSongCount = (playlists) => {
        if (!playlists || playlists.length === 0) return 0;
        return playlists.reduce((total, p) => total + (p.track_count || 0), 0);
      };

      // Combine and deduplicate
      const memberGroupsList = (memberGroups || []).map(m => m.groups).filter(Boolean);
      const allGroups = [...(ownedGroups || []), ...memberGroupsList];
      const uniqueGroups = Array.from(new Map(allGroups.map(g => [g.id, g])).values())
        .map(group => ({
          ...group,
          memberCount: (group.group_members?.[0]?.count || 0) + 1,
          songCount: calculateSongCount(group.group_playlists)
        }));

      setGroups(uniqueGroups);
      setError(null);
      cacheUserGroups(uniqueGroups);
    } catch (err) {
      console.error('[useRealtimeGroups] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      const cached = getCachedUserGroups();
      if (!cached) {
        setLoading(true);
      }
      fetchGroups();
    }
  }, [userId, fetchGroups]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    // Listen for user being added/removed from groups
    const unsub = subscribe({
      table: 'group_members',
      event: '*',
      filter: `user_id=eq.${userId}`,
      callback: (payload) => {
        console.log('[useRealtimeGroups] Member change:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
          // User joined a group - fetch the new group details
          fetchGroups();
          optionsRef.current.onGroupAdded?.(payload.new);
        } else if (payload.eventType === 'DELETE') {
          // User left a group - remove from state
          setGroups(prev => {
            const updated = prev.filter(g => g.id !== payload.old.group_id);
            cacheUserGroups(updated);
            return updated;
          });
          optionsRef.current.onGroupRemoved?.(payload.old);
        }
      },
      channelName: `user-${userId}-groups`,
    });

    // Also listen for group updates (name changes, etc.)
    const unsub2 = subscribe({
      table: 'groups',
      event: 'UPDATE',
      callback: (payload) => {
        setGroups(prev => {
          const updated = prev.map(g => 
            g.id === payload.new.id ? { ...g, ...payload.new } : g
          );
          // Only update if this group is in our list
          if (prev.some(g => g.id === payload.new.id)) {
            cacheUserGroups(updated);
          }
          return updated;
        });
      },
      channelName: `user-${userId}-group-updates`,
    });

    return () => {
      unsub();
      unsub2();
    };
  }, [userId, subscribe, fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups, isConnected };
}

/**
 * Hook for real-time friends list updates
 * 
 * @param {string} userId - Current user ID
 * @param {Object} options - Options
 * @param {Function} options.onFriendAdded - Called when a friend is added
 * @param {Function} options.onFriendRemoved - Called when a friend is removed
 * @param {Function} options.onRequestReceived - Called when a friend request is received
 */
export function useRealtimeFriendsList(userId, options = {}) {
  const { subscribe, isConnected } = useRealtime();
  const [friends, setFriends] = useState(() => getCachedUserFriends() || []);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(() => getCachedUserFriends() === null);
  const [error, setError] = useState(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Fetch friends from API
  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
        cacheUserFriends(data.friends || []);
      }
    } catch (err) {
      console.error('[useRealtimeFriendsList] Error fetching friends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      if (data.success) {
        setPendingRequests(data.received || []);
      }
    } catch (err) {
      console.error('[useRealtimeFriendsList] Error fetching requests:', err);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      const cached = getCachedUserFriends();
      if (!cached) {
        setLoading(true);
      }
      fetchFriends();
      fetchPendingRequests();
    }
  }, [userId, fetchFriends, fetchPendingRequests]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    // Listen for friendship changes
    const unsub1 = subscribe({
      table: 'friendships',
      event: '*',
      callback: (payload) => {
        const isInvolved = payload.new?.user1_id === userId || 
                          payload.new?.user2_id === userId ||
                          payload.old?.user1_id === userId ||
                          payload.old?.user2_id === userId;
        
        if (!isInvolved) return;
        
        console.log('[useRealtimeFriendsList] Friendship change:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
          // New friendship - refetch friends list
          fetchFriends();
          optionsRef.current.onFriendAdded?.(payload.new);
        } else if (payload.eventType === 'DELETE') {
          // Friendship removed - refetch
          fetchFriends();
          optionsRef.current.onFriendRemoved?.(payload.old);
        }
      },
      channelName: `user-${userId}-friendships`,
    });

    // Listen for friend requests
    const unsub2 = subscribe({
      table: 'friend_requests',
      event: '*',
      filter: `receiver_id=eq.${userId}`,
      callback: (payload) => {
        console.log('[useRealtimeFriendsList] Friend request:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
          setPendingRequests(prev => [...prev, payload.new]);
          optionsRef.current.onRequestReceived?.(payload.new);
        } else if (payload.eventType === 'DELETE') {
          setPendingRequests(prev => prev.filter(r => r.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          // Request was accepted/rejected
          setPendingRequests(prev => prev.filter(r => r.id !== payload.new.id));
          if (payload.new.status === 'accepted') {
            fetchFriends(); // Refresh friends list
          }
        }
      },
      channelName: `user-${userId}-requests`,
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [userId, subscribe, fetchFriends]);

  return { 
    friends, 
    pendingRequests, 
    pendingCount: pendingRequests.length,
    loading, 
    error, 
    refetch: fetchFriends,
    refetchRequests: fetchPendingRequests,
    isConnected 
  };
}

/**
 * Hook for real-time friends' song of the day updates
 * 
 * @param {string} userId - Current user ID
 */
export function useRealtimeFriendsSongs(userId) {
  const { subscribe, isConnected } = useRealtime();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch friends' songs
  const fetchSongs = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/friends/songs');
      const data = await response.json();
      if (data.success) {
        setSongs(data.songs || []);
      }
    } catch (err) {
      console.error('[useRealtimeFriendsSongs] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchSongs();
    }
  }, [userId, fetchSongs]);

  // Subscribe to song of the day changes
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribe({
      table: 'song_of_the_day',
      event: '*',
      callback: (payload) => {
        console.log('[useRealtimeFriendsSongs] Song change:', payload.eventType);
        // Refetch to get friend info included
        fetchSongs();
      },
      channelName: 'song-of-the-day-all',
    });

    return unsub;
  }, [userId, subscribe, fetchSongs]);

  return { songs, loading, refetch: fetchSongs, isConnected };
}

/**
 * Hook for real-time profile updates
 * 
 * @param {string} userId - User ID to watch
 */
export function useRealtimeProfile(userId) {
  const { subscribe, isConnected } = useRealtime();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('[useRealtimeProfile] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  // Subscribe to profile changes
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribe({
      table: 'profiles',
      event: 'UPDATE',
      filter: `user_id=eq.${userId}`,
      callback: (payload) => {
        console.log('[useRealtimeProfile] Profile updated');
        setProfile(prev => ({ ...prev, ...payload.new }));
      },
      channelName: `profile-${userId}`,
    });

    return unsub;
  }, [userId, subscribe]);

  return { profile, loading, refetch: fetchProfile, isConnected };
}
