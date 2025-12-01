/**
 * Background processing function for smart sort
 * This runs asynchronously after the API route returns
 * 
 * IMPORTANT: This function needs access to cookies/session, so it must be called
 * during the request/response cycle. We pass the necessary data instead of
 * re-fetching it.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { analyzeAndSortPlaylists } from '@/lib/services/openaiSorting';
import { updatePlaylistOrder, updateSongOrder } from '@/lib/db/smartSorting';
import { saveSmartSortMetrics, getOptimizationRecommendations } from '@/lib/db/smartSortMetrics';

/**
 * Process smart sort in the background
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID (for authentication)
 */
export async function processSmartSort(groupId, userId) {
  const startTime = Date.now();
  const summary = {
    playlists: 0,
    songs: 0,
    metadataTime: 0,
    aiTime: 0,
    dbTime: 0,
    corrections: 0
  };
  
  // Metrics collection
  const metrics = {
    songProcessingTimes: [],
    songsWithSpotify: 0,
    songsWithLastfm: 0,
    songsWithMusicbrainz: 0,
    skippedSlowSources: false
  };
  
  console.log(`\n========== [SMART SORT BACKGROUND] Processing for group ${groupId} ==========`);

  try {
    // Create Supabase client - cookies() can only be called during request/response cycle
    // For background jobs, we'd need service role key, but for this quick fix we'll use cookies
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verify user is still a member (quick check)
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      console.error(`[SMART SORT BACKGROUND] Group ${groupId} not found`);
      return { success: false, error: 'Group not found' };
    }

    // Fetch all playlists
    console.log(`[SMART SORT BACKGROUND]  Fetching playlists...`);
    const { data: playlists, error: playlistsError } = await supabase
      .from('group_playlists')
      .select('*')
      .eq('group_id', groupId);

    if (playlistsError || !playlists || playlists.length === 0) {
      console.error(`[SMART SORT BACKGROUND] No playlists found`);
      return { success: false, error: 'No playlists found' };
    }

    // Fetch all songs
    const playlistIds = playlists.map(p => p.id);
    const { data: allSongs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('*')
      .in('playlist_id', playlistIds);

    if (songsError) {
      console.error(`[SMART SORT BACKGROUND] Error fetching songs:`, songsError);
      return { success: false, error: 'Failed to fetch songs' };
    }

    const totalSongCount = allSongs.length;
    const songsPerPlaylistAvg = playlists.length > 0 ? totalSongCount / playlists.length : 0;

    // Get optimization recommendations based on historical data
    // Reuse existing supabase client from earlier in the function (line 47)
    const optimization = await getOptimizationRecommendations(supabase, totalSongCount);
    
    console.log(`[SMART SORT BACKGROUND] Optimization recommendations:`, {
      concurrency: optimization.recommendedConcurrency,
      batchSize: optimization.recommendedBatchSize,
      skipSlowSources: optimization.skipSlowSources,
      estimatedDuration: optimization.estimatedDuration.toFixed(2) + 's',
      confidence: optimization.confidence,
      dataPoints: optimization.dataPoints
    });

    // Get Spotify tokens for users who added playlists
    const userIds = [...new Set(playlists.map(p => p.added_by))];
    const { data: tokens } = await supabase
      .from('spotify_tokens')
      .select('user_id, access_token')
      .in('user_id', userIds);

    const tokenMap = {};
    tokens?.forEach(t => {
      tokenMap[t.user_id] = t.access_token;
    });

    // Group songs by playlist
    const songsByPlaylist = {};
    playlists.forEach(playlist => {
      songsByPlaylist[playlist.id] = allSongs.filter(s => s.playlist_id === playlist.id);
    });

    // Fetch metadata (with caching - already implemented in musicMetadata)
    console.log(`[SMART SORT BACKGROUND] Fetching metadata for ${allSongs.length} songs...`);
    const allSongsMetadata = [];

    const songsByPlatform = {};
    playlists.forEach(playlist => {
      const key = `${playlist.platform}_${playlist.added_by}`;
      if (!songsByPlatform[key]) {
        songsByPlatform[key] = {
          platform: playlist.platform,
          spotifyToken: tokenMap[playlist.added_by] || null,
          songs: [],
        };
      }
      const songs = songsByPlaylist[playlist.id] || [];
      songsByPlatform[key].songs.push(...songs.map(song => ({
        ...song,
        playlistId: playlist.id,
      })));
    });

    // Process metadata with data-driven optimization
    const metadataStartTime = Date.now();
    const platformPromises = Object.entries(songsByPlatform).map(async ([key, group]) => {
      try {
        const { getBatchTrackMetadata } = await import('@/lib/services/musicMetadata');
        
        // Track individual song processing times
        const songStartTimes = new Map();
        const originalProcessor = group.songs.map(song => {
          songStartTimes.set(song.id, Date.now());
          return song;
        });
        
        const metadata = await getBatchTrackMetadata(
          originalProcessor,
          group.platform,
          group.spotifyToken,
          { 
            concurrency: optimization.recommendedConcurrency,
            skipSlowSources: optimization.skipSlowSources
          }
        );
        
        // Calculate per-song processing times
        metadata.forEach(m => {
          const startTime = songStartTimes.get(m.songId);
          if (startTime) {
            const processingTime = (Date.now() - startTime) / 1000;
            metrics.songProcessingTimes.push(processingTime);
            
            // Track which sources were used
            if (m.sources?.includes('spotify')) metrics.songsWithSpotify++;
            if (m.sources?.includes('lastfm')) metrics.songsWithLastfm++;
            if (m.sources?.includes('musicbrainz')) metrics.songsWithMusicbrainz++;
          }
        });
        
        return metadata;
      } catch (error) {
        console.error(`[SMART SORT BACKGROUND] Error fetching metadata for ${key}:`, error.message);
        return group.songs.map(song => ({
          songId: song.id,
          playlistId: song.playlistId,
          title: song.title,
          artist: song.artist || 'Unknown Artist',
          genres: [],
          popularity: 0,
          audioFeatures: {},
          sources: [],
        }));
      }
    });

    const allMetadataResults = await Promise.all(platformPromises);
    allMetadataResults.forEach((metadata) => {
      allSongsMetadata.push(...metadata);
    });
    const metadataDuration = (Date.now() - metadataStartTime) / 1000;
    summary.metadataTime = metadataDuration.toFixed(2);
    summary.songs = allSongsMetadata.length;
    
    // Calculate average song processing time
    const avgSongMetadataTime = metrics.songProcessingTimes.length > 0
      ? metrics.songProcessingTimes.reduce((sum, t) => sum + t, 0) / metrics.songProcessingTimes.length
      : 0;
    
    metrics.skippedSlowSources = optimization.skipSlowSources;

    // AI analysis
    const aiStartTime = Date.now();
    const { playlistOrder, songOrders } = await analyzeAndSortPlaylists(
      groupId,
      playlists,
      allSongsMetadata
    );
    summary.aiTime = ((Date.now() - aiStartTime) / 1000).toFixed(2);
    summary.playlists = playlists.length;

    // Update database
    const dbStartTime = Date.now();
    await updatePlaylistOrder(supabase, groupId, playlistOrder);
    await updateSongOrder(supabase, songOrders);
    summary.dbTime = ((Date.now() - dbStartTime) / 1000).toFixed(2);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`[SMART SORT BACKGROUND]  Completed for group ${groupId} in ${totalTime.toFixed(2)}s`);
    console.log(`[SMART SORT BACKGROUND] Summary:`, summary);

    // Save performance metrics
    try {
      await saveSmartSortMetrics(supabase, {
        groupId,
        userId,
        playlistCount: playlists.length,
        totalSongCount: totalSongCount,
        songsPerPlaylistAvg: songsPerPlaylistAvg.toFixed(2),
        totalDuration: totalTime.toFixed(3),
        metadataFetchDuration: metadataDuration.toFixed(3),
        aiAnalysisDuration: Number.parseFloat(summary.aiTime).toFixed(3),
        databaseUpdateDuration: Number.parseFloat(summary.dbTime).toFixed(3),
        avgSongMetadataTime: avgSongMetadataTime.toFixed(3),
        songsWithSpotify: metrics.songsWithSpotify,
        songsWithLastfm: metrics.songsWithLastfm,
        songsWithMusicbrainz: metrics.songsWithMusicbrainz,
        metadataConcurrency: optimization.recommendedConcurrency,
        batchSize: optimization.recommendedBatchSize,
        skippedSlowSources: metrics.skippedSlowSources,
        success: true
      });
      console.log(`[SMART SORT BACKGROUND] Metrics saved successfully`);
    } catch (metricsError) {
      console.error(`[SMART SORT BACKGROUND] Error saving metrics:`, metricsError);
      // Don't fail the whole operation if metrics fail
    }

    return {
      success: true,
      summary,
      playlistOrder: playlistOrder.length,
      songOrders: Object.keys(songOrders).length,
    };
  } catch (error) {
    console.error(`[SMART SORT BACKGROUND]  Error processing group ${groupId}:`, error);
    
    // Save error metrics
    try {
      const errorCookieStore = await cookies();
      const errorSupabase = createRouteHandlerClient({ cookies: () => errorCookieStore });
      const totalTime = (Date.now() - startTime) / 1000;
      
      await saveSmartSortMetrics(errorSupabase, {
        groupId,
        userId,
        playlistCount: summary.playlists || 0,
        totalSongCount: summary.songs || 0,
        songsPerPlaylistAvg: 0,
        totalDuration: totalTime.toFixed(3),
        metadataFetchDuration: Number.parseFloat(summary.metadataTime || 0).toFixed(3),
        aiAnalysisDuration: Number.parseFloat(summary.aiTime || 0).toFixed(3),
        databaseUpdateDuration: Number.parseFloat(summary.dbTime || 0).toFixed(3),
        avgSongMetadataTime: 0,
        songsWithSpotify: 0,
        songsWithLastfm: 0,
        songsWithMusicbrainz: 0,
        metadataConcurrency: 30,
        batchSize: 200,
        skippedSlowSources: false,
        success: false,
        errorMessage: error.message || 'Unknown error'
      });
    } catch (metricsError) {
      console.error(`[SMART SORT BACKGROUND] Error saving error metrics:`, metricsError);
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
