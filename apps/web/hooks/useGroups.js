'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/RealtimeProvider';
import { getCachedUserGroups, cacheUserGroups } from '@/lib/cache/clientCache';

export function useGroups() {
  const { subscribe, isConnected } = useRealtime();
  // Initialize with cached data for instant display
  const [groups, setGroups] = useState(() => getCachedUserGroups() || []);
  const [loading, setLoading] = useState(() => getCachedUserGroups() === null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  const loadGroups = useCallback(async () => {
    try {
      // Don't show loading if we have cached data
      if (groups.length === 0) {
        setLoading(true);
      }
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Get groups where user is owner (with member count and playlists for song count)
      const { data: ownedGroups, error: ownedError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(count),
          group_playlists(track_count)
        `)
        .eq('owner_id', session.user.id);

      if (ownedError) throw ownedError;

      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups(
            *,
            group_members(count),
            group_playlists(track_count)
          )
        `)
        .eq('user_id', session.user.id);

      if (memberError) throw memberError;

      // Helper function to calculate total song count from playlists
      const calculateSongCount = (playlists) => {
        if (!playlists || playlists.length === 0) return 0;
        return playlists.reduce((total, playlist) => total + (playlist.track_count || 0), 0);
      };

      // Transform and combine groups
      const memberGroupsList = (memberGroups || []).map(m => ({
        ...m.groups,
        memberCount: (m.groups?.group_members?.[0]?.count || 0) + 1,
        songCount: calculateSongCount(m.groups?.group_playlists)
      })).filter(g => g.id);

      const ownedGroupsList = (ownedGroups || []).map(g => ({
        ...g,
        memberCount: (g.group_members?.[0]?.count || 0) + 1,
        songCount: calculateSongCount(g.group_playlists)
      }));

      // Combine and remove duplicates
      const allGroups = [...ownedGroupsList, ...memberGroupsList];
      const uniqueGroups = allGroups.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );

      setGroups(uniqueGroups);
      setError(null);
      // Cache for next time
      cacheUserGroups(uniqueGroups);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [groups.length]);

  // Initial load
  useEffect(() => {
    loadGroups();
  }, []);

  // Subscribe to realtime updates for user's group membership
  useEffect(() => {
    if (!userId) return;

    // Listen for user being added/removed from groups
    const unsub1 = subscribe({
      table: 'group_members',
      event: '*',
      filter: `user_id=eq.${userId}`,
      callback: (payload) => {
        console.log('[useGroups] Membership change:', payload.eventType);
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          // Refetch to get full group data
          loadGroups();
        }
      },
      channelName: `user-${userId}-group-membership`,
    });

    // Listen for group metadata updates (name, description, etc.)
    const unsub2 = subscribe({
      table: 'groups',
      event: 'UPDATE',
      callback: (payload) => {
        setGroups(prev => {
          // Only update if this group is in our list
          if (!prev.some(g => g.id === payload.new.id)) return prev;
          
          const updated = prev.map(g => 
            g.id === payload.new.id ? { ...g, ...payload.new } : g
          );
          cacheUserGroups(updated);
          return updated;
        });
      },
      channelName: `user-${userId}-group-updates`,
    });

    // Listen for group deletions
    const unsub3 = subscribe({
      table: 'groups',
      event: 'DELETE',
      callback: (payload) => {
        setGroups(prev => {
          const updated = prev.filter(g => g.id !== payload.old.id);
          cacheUserGroups(updated);
          return updated;
        });
      },
      channelName: `user-${userId}-group-deletions`,
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [userId, subscribe, loadGroups]);

  const createGroup = async (name, description = '') => {
    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Generate join code (6 characters)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking chars (I, O, 0, 1)
      let joinCode = '';
      for (let i = 0; i < 6; i++) {
        joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          owner_id: session.user.id,
          join_code: joinCode
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as member
      await supabase.from('group_members').insert({
        group_id: data.id,
        user_id: session.user.id,
        role: 'owner'
      });

      // Reload groups
      await loadGroups();
      
      return data;
    } catch (err) {
      console.error('Error creating group:', err);
      throw err;
    }
  };

  return {
    groups,
    createGroup,
    loading,
    error,
    refetch: loadGroups,
    isConnected
  };
}
