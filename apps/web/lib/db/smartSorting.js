/**
 * Database functions for smart sorting
 * Handles saving and retrieving AI-generated ordering
 */

/**
 * Update playlist order for a group
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @param {Array} playlistOrder - Array of {playlistId, order} objects
 * @returns {Promise<Object>} Summary of updates
 */
export async function updatePlaylistOrder(supabase, groupId, playlistOrder) {
  const summary = {
    total: playlistOrder.length,
    successful: 0,
    failed: 0
  };

  console.log(`[smartSorting] 📝 Updating ${playlistOrder.length} playlist order(s)`);

  const updates = playlistOrder.map(({ playlistId, order }) =>
    supabase
      .from('group_playlists')
      .update({ 
        smart_sorted_order: order,
        last_sorted_at: new Date().toISOString()
      })
      .eq('id', playlistId)
      .eq('group_id', groupId)
      .select('id, smart_sorted_order')
  );

  const results = await Promise.allSettled(updates);
  
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.data && result.value.data.length > 0) {
      summary.successful++;
    } else {
      summary.failed++;
    }
  });

  console.log(`[smartSorting] ✅ Updated ${summary.successful}/${summary.total} playlists`);
  return summary;
}

/**
 * Update song order for playlists
 * @param {Object} supabase - Supabase client instance
 * @param {Object} songOrders - Object mapping playlistId to array of {songId, order}
 * @returns {Promise<Object>} Summary with updateMap for corrections
 */
export async function updateSongOrder(supabase, songOrders) {
  const totalSongs = Object.values(songOrders).reduce((sum, orders) => sum + orders.length, 0);
  const summary = {
    totalSongs,
    playlists: Object.keys(songOrders).length,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  console.log(`[smartSorting] 📝 Updating ${totalSongs} song(s) across ${summary.playlists} playlist(s)`);

  // Build update promises with metadata tracking
  const allUpdates = [];
  const updateMap = new Map(); // songId -> { playlistId, order } for correction
  
  Object.entries(songOrders).forEach(([playlistId, songOrder]) => {
    songOrder.forEach(({ songId, order }) => {
      updateMap.set(songId, { playlistId, order });
      allUpdates.push(
        supabase
          .from('playlist_songs')
          .update({ smart_sorted_order: order })
          .eq('id', songId)
          .eq('playlist_id', playlistId)
          .select('id, smart_sorted_order')
      );
    });
  });

  // Execute all updates in parallel
  const BATCH_SIZE = 200;
  const updateStartTime = Date.now();
  
  for (let i = 0; i < allUpdates.length; i += BATCH_SIZE) {
    const batch = allUpdates.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { data, error } = result.value;
        if (error) {
          summary.failed++;
          summary.errors.push(error.message || error.code);
        } else if (data && data.length > 0) {
          summary.successful++;
        } else {
          summary.failed++;
          summary.errors.push('No rows returned');
        }
      } else {
        summary.failed++;
        summary.errors.push(result.reason?.message || 'Promise rejected');
      }
    });
  }
  
  const updateTime = ((Date.now() - updateStartTime) / 1000).toFixed(2);
  console.log(`[smartSorting] ✅ Updated ${summary.successful}/${summary.totalSongs} songs in ${updateTime}s`);
  
  if (summary.failed > 0) {
    console.error(`[smartSorting] ❌ ${summary.failed} failed`);
  }
  
  // Store update map for correction
  summary.updateMap = updateMap;
  return summary;
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
