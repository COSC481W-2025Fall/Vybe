'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Get groups where user is owner
      const { data: ownedGroups, error: ownedError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(count)
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
            group_members(count)
          )
        `)
        .eq('user_id', session.user.id);

      if (memberError) throw memberError;

      // Transform and combine groups
      const memberGroupsList = (memberGroups || []).map(m => ({
        ...m.groups,
        memberCount: m.groups.group_members?.[0]?.count || 0
      }));

      const ownedGroupsList = (ownedGroups || []).map(g => ({
        ...g,
        memberCount: g.group_members?.[0]?.count || 0,
        songCount: 0 // TODO: Get actual song count from playlists
      }));

      // Combine and remove duplicates
      const allGroups = [...ownedGroupsList, ...memberGroupsList];
      const uniqueGroups = allGroups.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );

      setGroups(uniqueGroups);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (name, description = '', isPrivate = false) => {
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
          is_private: isPrivate,
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
    error
  };
}
