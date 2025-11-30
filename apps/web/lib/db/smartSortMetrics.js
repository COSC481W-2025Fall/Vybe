/**
 * Smart Sort Metrics Database Functions
 * Tracks performance data and provides optimization recommendations
 */

/**
 * Check if user has opted in to data collection
 * @param {Object} supabase - Supabase client instance
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has opted in
 */
export async function hasOptedInToDataCollection(supabase, userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('smart_sort_data_collection')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Default to false (opt-out) if no preference found
    return false;
  }

  return data.smart_sort_data_collection === true;
}

/**
 * Save smart sort performance metrics (only if user has opted in)
 * @param {Object} supabase - Supabase client instance
 * @param {Object} metrics - Metrics object
 * @returns {Promise<Object|null>} Saved metrics record or null if opted out
 */
export async function saveSmartSortMetrics(supabase, metrics) {
  // Check if user has opted in
  const optedIn = await hasOptedInToDataCollection(supabase, metrics.userId);
  
  if (!optedIn) {
    console.log('[smartSortMetrics] User has not opted in to data collection, skipping metrics save');
    return null;
  }
  const {
    groupId,
    userId,
    playlistCount,
    totalSongCount,
    songsPerPlaylistAvg,
    totalDuration,
    metadataFetchDuration,
    aiAnalysisDuration,
    databaseUpdateDuration,
    avgSongMetadataTime,
    songsWithSpotify,
    songsWithLastfm,
    songsWithMusicbrainz,
    metadataConcurrency,
    batchSize,
    skippedSlowSources,
    success,
    errorMessage
  } = metrics;

  const { data, error } = await supabase
    .from('smart_sort_metrics')
    .insert({
      group_id: groupId,
      user_id: userId,
      playlist_count: playlistCount,
      total_song_count: totalSongCount,
      songs_per_playlist_avg: songsPerPlaylistAvg,
      total_duration: totalDuration,
      metadata_fetch_duration: metadataFetchDuration,
      ai_analysis_duration: aiAnalysisDuration,
      database_update_duration: databaseUpdateDuration,
      avg_song_metadata_time: avgSongMetadataTime,
      songs_with_spotify: songsWithSpotify || 0,
      songs_with_lastfm: songsWithLastfm || 0,
      songs_with_musicbrainz: songsWithMusicbrainz || 0,
      metadata_concurrency: metadataConcurrency,
      batch_size: batchSize,
      skipped_slow_sources: skippedSlowSources || false,
      success: success !== false,
      error_message: errorMessage || null
    })
    .select()
    .single();

  if (error) {
    console.error('[smartSortMetrics] Error saving metrics:', error);
    return null;
  }

  return data;
}

/**
 * Get optimization recommendations based on historical data
 * @param {Object} supabase - Supabase client instance
 * @param {number} songCount - Number of songs to process
 * @returns {Promise<Object>} Optimization recommendations
 */
export async function getOptimizationRecommendations(supabase, songCount) {
  // Define song count ranges for analysis
  const ranges = [
    { min: 0, max: 50, name: 'small' },
    { min: 50, max: 200, name: 'medium' },
    { min: 200, max: 500, name: 'large' },
    { min: 500, max: Infinity, name: 'very_large' }
  ];

  const range = ranges.find(r => songCount >= r.min && songCount < r.max);
  const rangeName = range?.name || 'medium';

  // Get recent successful metrics for similar sizes
  // Look at songs within ±25% of target count
  const minSongs = Math.floor(songCount * 0.75);
  const maxSongs = Math.ceil(songCount * 1.25);

  const { data: recentMetrics, error } = await supabase
    .from('smart_sort_metrics')
    .select('*')
    .eq('success', true)
    .gte('total_song_count', minSongs)
    .lte('total_song_count', maxSongs)
    .order('created_at', { ascending: false })
    .limit(50); // Analyze last 50 similar runs

  if (error || !recentMetrics || recentMetrics.length === 0) {
    // Return default recommendations if no data
    return getDefaultRecommendations(songCount);
  }

  // Calculate averages and optimal settings
  const avgMetadataTime = recentMetrics.reduce((sum, m) => sum + (parseFloat(m.metadata_fetch_duration) || 0), 0) / recentMetrics.length;
  const avgPerSongTime = recentMetrics.reduce((sum, m) => sum + (parseFloat(m.avg_song_metadata_time) || 0), 0) / recentMetrics.length;
  const avgConcurrency = recentMetrics.reduce((sum, m) => sum + (m.metadata_concurrency || 30), 0) / recentMetrics.length;
  
  // Find best performing runs (fastest with good success rate)
  const bestRuns = recentMetrics
    .filter(m => parseFloat(m.total_duration) > 0)
    .sort((a, b) => parseFloat(a.total_duration) - parseFloat(b.total_duration))
    .slice(0, 10);

  // MAXIMIZE CONCURRENCY - Always use maximum for speed, regardless of size
  // Historical data can inform us, but we always prioritize maximum speed
  const maxConcurrency = 50; // Maximum concurrency for all requests
  const optimalConcurrency = bestRuns.length > 0
    ? Math.max(maxConcurrency, Math.round(bestRuns.reduce((sum, m) => sum + (m.metadata_concurrency || 30), 0) / bestRuns.length))
    : maxConcurrency;

  // Determine if we should skip slow sources
  const skipSlowSources = avgPerSongTime > 0.5 || songCount > 300; // Skip if avg > 0.5s per song or >300 songs

  // Calculate optimal batch size based on performance
  const optimalBatchSize = songCount > 500 ? 500 : songCount > 200 ? 300 : 200;

  return {
    recommendedConcurrency: maxConcurrency, // Always maximize concurrency
    recommendedBatchSize: optimalBatchSize,
    skipSlowSources: skipSlowSources,
    estimatedDuration: avgMetadataTime + (avgPerSongTime * songCount),
    confidence: recentMetrics.length >= 10 ? 'high' : recentMetrics.length >= 5 ? 'medium' : 'low',
    dataPoints: recentMetrics.length,
    range: rangeName
  };
}

/**
 * Get default recommendations when no historical data exists
 * @param {number} songCount - Number of songs
 * @returns {Object} Default recommendations
 */
function getDefaultRecommendations(songCount) {
  // MAXIMIZE CONCURRENCY - Always use maximum (50) regardless of size
  const maxConcurrency = 50;
  
  if (songCount <= 50) {
    return {
      recommendedConcurrency: maxConcurrency,
      recommendedBatchSize: 200,
      skipSlowSources: false,
      estimatedDuration: songCount * 0.3, // ~0.3s per song default
      confidence: 'low',
      dataPoints: 0,
      range: 'small'
    };
  } else if (songCount <= 200) {
    return {
      recommendedConcurrency: maxConcurrency,
      recommendedBatchSize: 300,
      skipSlowSources: false,
      estimatedDuration: songCount * 0.25,
      confidence: 'low',
      dataPoints: 0,
      range: 'medium'
    };
  } else if (songCount <= 500) {
    return {
      recommendedConcurrency: maxConcurrency,
      recommendedBatchSize: 400,
      skipSlowSources: true,
      estimatedDuration: songCount * 0.2,
      confidence: 'low',
      dataPoints: 0,
      range: 'large'
    };
  } else {
    return {
      recommendedConcurrency: maxConcurrency,
      recommendedBatchSize: 500,
      skipSlowSources: true,
      estimatedDuration: songCount * 0.15,
      confidence: 'low',
      dataPoints: 0,
      range: 'very_large'
    };
  }
}

/**
 * Get performance statistics for a specific group
 * @param {Object} supabase - Supabase client instance
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Performance statistics
 */
export async function getGroupPerformanceStats(supabase, groupId) {
  const { data, error } = await supabase
    .from('smart_sort_metrics')
    .select('*')
    .eq('group_id', groupId)
    .eq('success', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    return null;
  }

  const stats = {
    totalRuns: data.length,
    avgDuration: data.reduce((sum, m) => sum + parseFloat(m.total_duration || 0), 0) / data.length,
    avgSongCount: data.reduce((sum, m) => sum + (m.total_song_count || 0), 0) / data.length,
    avgPerSongTime: data.reduce((sum, m) => sum + parseFloat(m.avg_song_metadata_time || 0), 0) / data.length,
    lastRun: data[0],
    trends: {
      gettingFaster: data.length >= 3 && 
        parseFloat(data[0].total_duration) < parseFloat(data[data.length - 1].total_duration),
      gettingSlower: data.length >= 3 && 
        parseFloat(data[0].total_duration) > parseFloat(data[data.length - 1].total_duration)
    }
  };

  return stats;
}

