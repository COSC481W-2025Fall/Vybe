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

      // TODO: Query communities table
      // For now, using mock communities
      setCommunities([
        {
          id: 'comm-1',
          name: 'Indie Discoveries',
          description: 'Finding hidden gems in indie music',

          member_count: 6767,

          //Mock group count
          group_count: 45
        },
        {
          id: 'comm-2',
          name: 'Jazz Lounge',
          description: 'Classic and modern jazz appreciation',
          member_count: 892,
          //Mock group count
          group_count: 32
        },
        {
          id: 'comm-3',
          name: 'Electronic Pulse',
          description: 'Latest electronic and dance tracks',
          member_count: 2156,
          //Mock group count
          group_count: 78
        }
      ]);
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
