'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Helper function to populate communities with song counts from curated_songs table
 * @param {Array} communities - Array of community objects
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Array>} Communities with song counts added
 */
async function populateCommunitiesWithSongCounts(communities, supabase) {
  if (!communities || communities.length === 0) {
    return communities;
  }

  try {
    // Get all community IDs
    const communityIds = communities.map(c => c.id);

    // Query curated_songs to count approved songs per community
    // Only count approved songs (pending/removed are not shown to users)
    const { data: songCounts, error: countError } = await supabase
      .from('curated_songs')
      .select('community_id, status')
      .in('community_id', communityIds)
      .eq('status', 'approved');

    if (countError) {
      // If curated_songs table doesn't exist, just return communities without counts
      if (countError.code === '42P01' || countError.message?.includes('does not exist')) {
        console.warn('curated_songs table does not exist. Song counts will not be available.');
        return communities.map(c => ({ ...c, song_count: 0 }));
      }
      console.error('Error fetching song counts:', countError);
      return communities.map(c => ({ ...c, song_count: 0 }));
    }

    // Count songs per community
    const countMap = {};
    songCounts?.forEach(song => {
      countMap[song.community_id] = (countMap[song.community_id] || 0) + 1;
    });

    // Add song_count to each community
    return communities.map(community => ({
      ...community,
      song_count: countMap[community.id] || 0
    }));
  } catch (error) {
    console.error('Error populating communities with song counts:', error);
    // Return communities with 0 counts on error
    return communities.map(c => ({ ...c, song_count: 0 }));
  }
}

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

      const fetchJson = async (url) => {
        const response = await fetch(url);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = payload?.error || payload?.message || `Request failed: ${response.status}`;
          throw new Error(message);
        }
        return payload;
      };

      // Load the user's current song of the day and their friends' recent songs
      const [mySongResult, friendsSongsResult] = await Promise.allSettled([
        fetchJson('/api/song-of-the-day'),
        fetchJson('/api/friends/songs')
      ]);

      if (mySongResult.status === 'fulfilled' && mySongResult.value?.success) {
        setSongOfTheDay(mySongResult.value.songOfDay || null);
      } else if (mySongResult.status === 'rejected') {
        console.warn('Failed to fetch song of the day:', mySongResult.reason);
      }

      if (friendsSongsResult.status === 'fulfilled' && friendsSongsResult.value?.success) {
        setFriendsSongsOfTheDay(friendsSongsResult.value.songs || []);
      } else {
        console.warn(
          'Failed to fetch friends songs:',
          friendsSongsResult.status === 'rejected'
            ? friendsSongsResult.reason
            : friendsSongsResult.value?.error
        );
        setFriendsSongsOfTheDay([]);
      }

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
        // Populate communities with song counts from curated_songs
        const communitiesWithCounts = await populateCommunitiesWithSongCounts(
          communitiesData || [],
          supabase
        );
        setCommunities(communitiesWithCounts);
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
