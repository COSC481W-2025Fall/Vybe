'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function useSocial() {
  const [songOfTheDay, setSongOfTheDay] = useState(null);
  const [friendsSongsOfTheDay, setFriendsSongsOfTheDay] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // TODO: Query song_shares table for friends' songs
      // For now, using empty array
      setFriendsSongsOfTheDay([]);

      // Query communities table
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (communitiesError) {
        // Check if it's a "relation does not exist" error (table not created)
        if (communitiesError.code === '42P01' || communitiesError.message?.includes('does not exist')) {
          console.warn('Communities table does not exist. Please run the migration: apps/web/supabase/migrations/009_create_communities_table.sql');
          setCommunities([]);
        } else {
          console.error('Error fetching communities:', communitiesError);
          setCommunities([]);
        }
      } else {
        setCommunities(communitiesData || []);
      }
    } catch (err) {
      console.error('Error loading social data:', err);
      setError(err.message || 'Failed to load social data');
    } finally {
      setLoading(false);
    }
  };

  return {
    songOfTheDay,
    friendsSongsOfTheDay,
    communities,
    loading,
    error
  };
}
