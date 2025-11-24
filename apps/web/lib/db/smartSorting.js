/**
 * Database functions for smart sorting
 * Handles saving and retrieving AI-generated ordering
 */

/**
 * Update playlist order for a group
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @param {Array} playlistOrder - Array of {playlistId, order} objects
 * @returns {Promise<void>}
 */
export async function updatePlaylistOrder(supabase, groupId, playlistOrder) {

  // Update each playlist's smart_sorted_order
  const updates = playlistOrder.map(({ playlistId, order }) =>
    supabase
      .from('group_playlists')
      .update({ smart_sorted_order: order })
      .eq('id', playlistId)
      .eq('group_id', groupId)
  );

  await Promise.all(updates);

  // Update last_sorted_at for all playlists in the group
  await supabase
    .from('group_playlists')
    .update({ last_sorted_at: new Date().toISOString() })
    .eq('group_id', groupId);
}

/**
 * Update song order for playlists
 * @param {Object} supabase - Supabase client instance
 * @param {Object} songOrders - Object mapping playlistId to array of {songId, order}
 * @returns {Promise<void>}
 */
export async function updateSongOrder(supabase, songOrders) {

  // Update songs for each playlist
  const updates = Object.entries(songOrders).map(([playlistId, songOrder]) => {
    const songUpdates = songOrder.map(({ songId, order }) =>
      supabase
        .from('playlist_songs')
        .update({ smart_sorted_order: order })
        .eq('id', songId)
        .eq('playlist_id', playlistId)
    );
    return Promise.all(songUpdates);
  });

  await Promise.all(updates);
}

/**
 * Get playlists ordered by smart_sorted_order (or original order if not sorted)
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} Array of playlists
 */
export async function getSortedPlaylists(supabase, groupId) {

  const { data, error } = await supabase
    .from('group_playlists')
    .select('*')
    .eq('group_id', groupId)
    .order('smart_sorted_order', { ascending: true, nullsLast: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[smartSorting] Error fetching sorted playlists:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get songs ordered by smart_sorted_order (or original position if not sorted)
 * @param {Object} supabase - Supabase client instance
 * @param {string} playlistId - Playlist ID
 * @returns {Promise<Array>} Array of songs
 */
export async function getSortedSongs(supabase, playlistId) {

  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('smart_sorted_order', { ascending: true, nullsLast: true })
    .order('position', { ascending: true });

  if (error) {
    console.error('[smartSorting] Error fetching sorted songs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all songs from all playlists in a group, ordered by smart sorting
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} Array of songs with playlist info
 */
export async function getAllSortedSongsInGroup(supabase, groupId) {
  // Get playlists ordered by smart sort
  const playlists = await getSortedPlaylists(supabase, groupId);

  // Get songs from each playlist, maintaining playlist order
  const allSongs = [];
  for (const playlist of playlists) {
      const songs = await getSortedSongs(supabase, playlist.id);
    allSongs.push(...songs.map(song => ({
      ...song,
      playlistId: playlist.id,
      playlistName: playlist.name,
      playlistPlatform: playlist.platform,
    })));
  }

  return allSongs;
}

/**
 * Check if a group has been smart sorted
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>}
 */
export async function hasSmartSorting(supabase, groupId) {

  const { data, error } = await supabase
    .from('group_playlists')
    .select('smart_sorted_order')
    .eq('group_id', groupId)
    .not('smart_sorted_order', 'is', null)
    .limit(1);

  if (error) {
    console.error('[smartSorting] Error checking smart sorting:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Clear smart sorting for a group (reset to original order)
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @returns {Promise<void>}
 */
export async function clearSmartSorting(supabase, groupId) {

  // Get all playlists in the group
  const { data: playlists } = await supabase
    .from('group_playlists')
    .select('id')
    .eq('group_id', groupId);

  if (!playlists || playlists.length === 0) {
    return;
  }

  const playlistIds = playlists.map(p => p.id);

  // Clear smart_sorted_order for all playlists
  await supabase
    .from('group_playlists')
    .update({ smart_sorted_order: null, last_sorted_at: null })
    .eq('group_id', groupId);

  // Clear smart_sorted_order for all songs in these playlists
  await supabase
    .from('playlist_songs')
    .update({ smart_sorted_order: null })
    .in('playlist_id', playlistIds);
}

