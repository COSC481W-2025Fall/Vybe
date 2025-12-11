import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken as getSpotifyToken } from '@/lib/spotify';
import { getValidAccessToken as getYouTubeToken } from '@/lib/youtube';
import { trackIdToUri, searchSpotifyTrack } from '@/lib/services/spotifyExport';
import { 
  prefetchCachedPlatformIds, 
  getCachedIdFromMap,
  batchCacheSearchResults 
} from '@/lib/services/globalSongDatabase';

// Lazy initialization of supabase admin client
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabaseAdmin;
}

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const SPOTIFY_BATCH_SIZE = 100; // Spotify max per request
const BATCH_DELAY_MS = 200; // Delay between batches for Spotify
const YOUTUBE_DELAY_MS = 1000; // Slower delay for YouTube to avoid quotas
const MAX_RETRIES = 5;
const RATE_LIMIT_BACKOFF_MS = 5000; // Base backoff for rate limits

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateJobProgress(jobId, updates) {
  const { error } = await getSupabaseAdmin()
    .from('export_jobs')
    .update(updates)
    .eq('id', jobId);
  
  if (error) {
    console.error(`[export-jobs-process] Failed to update job ${jobId}:`, error);
  }
}

async function fetchWithRateLimit(url, options, jobId, retryCount = 0) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    const backoffMs = Math.max(retryAfter * 1000, RATE_LIMIT_BACKOFF_MS * Math.pow(2, retryCount));
    
    console.log(`[export-jobs-process] Rate limited on job ${jobId}, waiting ${backoffMs}ms (retry ${retryCount + 1})`);
    
    if (retryCount < MAX_RETRIES) {
      await updateJobProgress(jobId, {
        current_step: `Rate limited by Spotify, retrying in ${Math.ceil(backoffMs / 1000)}s...`,
        retry_count: retryCount + 1,
        next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
        last_error: `Rate limit hit at ${new Date().toISOString()}`
      });
      
      await delay(backoffMs);
      return fetchWithRateLimit(url, options, jobId, retryCount + 1);
    }
    
    throw new Error('Max retries exceeded due to Spotify rate limiting');
  }
  
  return response;
}

// Process Spotify export
async function processSpotifyExport(jobId, tracks, accessToken, playlistName, description, isPublic, isCollaborative) {
  await updateJobProgress(jobId, {
    current_step: 'Pre-fetching cache...',
    total_tracks: tracks.length,
    progress: 5
  });

  // OPTIMIZATION: Pre-fetch all cache entries in parallel before processing
  // This batches database queries instead of making them one-by-one
  const tracksToLookup = tracks.filter(t => {
    const platform = t.playlist_platform || t.platform || 'youtube';
    return platform !== 'spotify' && t.title; // Only non-Spotify tracks need cache lookup
  });
  
  const { cacheMap, hits: prefetchHits, misses: prefetchMisses } = 
    await prefetchCachedPlatformIds(tracksToLookup, 'spotify');
  
  console.log(`[export-jobs-process] ⚡ Spotify pre-fetch: ${prefetchHits} cache hits, ${prefetchMisses} will need API search`);
  
  await updateJobProgress(jobId, {
    current_step: 'Converting tracks to Spotify format...',
    progress: 10
  });

  // Convert tracks to Spotify URIs - uses pre-fetched cache for O(1) lookups
  const trackUris = [];
  const failedTracks = [];
  const resultsToCache = []; // Collect results for batch caching
  let cacheHits = 0;
  let cacheMisses = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    
    // Check if job was cancelled (less frequently to reduce DB queries)
    if (i % 20 === 0) {
      const { data: currentJob } = await getSupabaseAdmin()
        .from('export_jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      
      if (currentJob?.status === 'cancelled') {
        console.log(`[export-jobs-process] Spotify job ${jobId} was cancelled`);
        return;
      }
    }

    try {
      let uri = null;
      const trackPlatform = track.playlist_platform || track.platform || 'youtube';
      
      // If track is already from Spotify, use its ID directly
      if (trackPlatform === 'spotify' && track.external_id) {
        uri = trackIdToUri(track.external_id);
        // Queue for background caching (non-blocking)
        resultsToCache.push({ title: track.title, artist: track.artist, platformId: track.external_id });
      } else if (track.title) {
        // Use O(1) lookup from pre-fetched cache map
        const cachedSpotifyId = getCachedIdFromMap(cacheMap, track.title, track.artist);
        
        if (cachedSpotifyId) {
          // Cache hit! No Spotify API search needed
          uri = trackIdToUri(cachedSpotifyId);
          cacheHits++;
        } else {
          // Cache miss - search Spotify API
          cacheMisses++;
          uri = await searchSpotifyTrack(track.title, track.artist, accessToken);
          
          // Queue for background caching if found
          if (uri) {
            const spotifyId = uri.replace('spotify:track:', '');
            resultsToCache.push({ title: track.title, artist: track.artist, platformId: spotifyId });
          }
        }
      }
      
      if (uri) {
        trackUris.push(uri);
      } else {
        failedTracks.push(track.title || 'Unknown');
      }
    } catch (err) {
      console.error(`[export-jobs-process] Error converting track "${track.title}":`, err);
      failedTracks.push(track.title || 'Unknown');
    }

    // Update progress every 10 tracks
    if (i % 10 === 0 || i === tracks.length - 1) {
      const conversionProgress = Math.floor((i / tracks.length) * 40) + 10;
      await updateJobProgress(jobId, {
        current_step: `Converting tracks... (${i + 1}/${tracks.length}, ${cacheHits} cached)`,
        progress: conversionProgress,
        exported_tracks: trackUris.length,
        failed_tracks: failedTracks.length
      });
    }

    // Small delay to avoid rate limits during search (not needed for cache hits)
    if (cacheMisses > 0 && cacheMisses % 5 === 0) {
      await delay(100);
    }
  }
  
  // Batch cache all new results in background (non-blocking)
  if (resultsToCache.length > 0) {
    batchCacheSearchResults(resultsToCache, 'spotify');
  }
  
  console.log(`[export-jobs-process] 📊 Spotify cache stats: ${cacheHits} hits, ${cacheMisses} misses`);

  if (!trackUris.length) {
    throw new Error('No tracks could be found on Spotify');
  }

  await updateJobProgress(jobId, {
    current_step: 'Creating Spotify playlist...',
    progress: 50
  });

  // Create Spotify playlist
  const createResponse = await fetchWithRateLimit(
    `${SPOTIFY_API_BASE}/me/playlists`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistName,
        description: description || `Exported from Vybe on ${new Date().toLocaleDateString()}`,
        public: isPublic,
        collaborative: isCollaborative
      })
    },
    jobId
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create Spotify playlist: ${createResponse.status} - ${errorText}`);
  }

  const createdPlaylist = await createResponse.json();

  await updateJobProgress(jobId, {
    current_step: 'Adding tracks to playlist...',
    progress: 60,
    external_playlist_id: createdPlaylist.id,
    external_playlist_url: createdPlaylist.external_urls?.spotify
  });

  // Add tracks in batches
  let addedTracks = 0;
  const totalBatches = Math.ceil(trackUris.length / SPOTIFY_BATCH_SIZE);

  for (let i = 0; i < trackUris.length; i += SPOTIFY_BATCH_SIZE) {
    const batch = trackUris.slice(i, i + SPOTIFY_BATCH_SIZE);
    const batchNum = Math.floor(i / SPOTIFY_BATCH_SIZE) + 1;

    // Check if job was cancelled
    const { data: currentJob } = await getSupabaseAdmin()
      .from('export_jobs')
      .select('status')
      .eq('id', jobId)
      .single();
    
    if (currentJob?.status === 'cancelled') {
      console.log(`[export-jobs-process] Spotify job ${jobId} was cancelled during track addition`);
      return;
    }

    try {
      const addResponse = await fetchWithRateLimit(
        `${SPOTIFY_API_BASE}/playlists/${createdPlaylist.id}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: batch })
        },
        jobId
      );

      if (addResponse.ok) {
        addedTracks += batch.length;
      } else {
        console.error(`[export-jobs-process] Failed to add Spotify batch ${batchNum}:`, await addResponse.text());
      }
    } catch (err) {
      console.error(`[export-jobs-process] Error adding Spotify batch ${batchNum}:`, err);
    }

    // Update progress
    const addProgress = 60 + Math.floor((batchNum / totalBatches) * 35);
    await updateJobProgress(jobId, {
      current_step: `Adding tracks... (batch ${batchNum}/${totalBatches})`,
      progress: addProgress,
      exported_tracks: addedTracks
    });

    // Slow-rolling delay between batches
    if (i + SPOTIFY_BATCH_SIZE < trackUris.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // Mark as completed
  await updateJobProgress(jobId, {
    status: 'completed',
    progress: 100,
    current_step: 'Export completed successfully!',
    completed_at: new Date().toISOString(),
    exported_tracks: addedTracks,
    failed_tracks: failedTracks.length
  });
}

// Process YouTube export
async function processYouTubeExport(jobId, tracks, accessToken, playlistName, description) {
  await updateJobProgress(jobId, {
    current_step: 'Pre-fetching cache...',
    total_tracks: tracks.length,
    progress: 5
  });

  // OPTIMIZATION: Pre-fetch all cache entries in parallel before processing
  const { cacheMap, hits: prefetchHits, misses: prefetchMisses } = 
    await prefetchCachedPlatformIds(tracks, 'youtube');
  
  console.log(`[export-jobs-process] ⚡ YouTube pre-fetch: ${prefetchHits} cache hits, ${prefetchMisses} will need API search`);

  await updateJobProgress(jobId, {
    current_step: 'Creating YouTube playlist...',
    progress: 10
  });

  // Create YouTube playlist
  const createResponse = await fetch(`${YOUTUBE_API_BASE}/playlists?part=snippet,status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        title: playlistName,
        description: description || `Exported from Vybe on ${new Date().toLocaleDateString()}`
      },
      status: {
        privacyStatus: 'private'
      }
    })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create YouTube playlist: ${createResponse.status} - ${errorText}`);
  }

  const createdPlaylist = await createResponse.json();
  const youtubePlaylistId = createdPlaylist.id;

  await updateJobProgress(jobId, {
    current_step: 'Searching and adding videos...',
    progress: 20,
    external_playlist_id: youtubePlaylistId,
    external_playlist_url: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`
  });

  // Search and add videos - uses pre-fetched cache for O(1) lookups
  let addedTracks = 0;
  let failedTracks = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  const resultsToCache = []; // Collect results for batch caching

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    
    // Check if job was cancelled (less frequently to reduce DB queries)
    if (i % 20 === 0) {
      const { data: currentJob } = await getSupabaseAdmin()
        .from('export_jobs')
        .select('status')
        .eq('id', jobId)
        .single();
      
      if (currentJob?.status === 'cancelled') {
        console.log(`[export-jobs-process] YouTube job ${jobId} was cancelled`);
        return;
      }
    }

    try {
      let videoId = null;
      
      // Use O(1) lookup from pre-fetched cache map
      const cachedVideoId = getCachedIdFromMap(cacheMap, track.title, track.artist);
      
      if (cachedVideoId) {
        // Cache hit! No YouTube API search needed - saves API quota
        videoId = cachedVideoId;
        cacheHits++;
      } else {
        // Cache miss - search YouTube API
        cacheMisses++;
        
        // Build search query
        const searchQuery = track.artist 
          ? `${track.artist} - ${track.title}`
          : track.title;

        // Search YouTube for the song
        const searchResponse = await fetch(
          `${YOUTUBE_API_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(searchQuery)}&maxResults=1`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        if (!searchResponse.ok) {
          console.error(`[export-jobs-process] YouTube search failed for "${searchQuery}"`);
          failedTracks++;
          await delay(YOUTUBE_DELAY_MS);
          continue;
        }

        const searchData = await searchResponse.json();

        if (!searchData.items || searchData.items.length === 0) {
          console.log(`[export-jobs-process] No YouTube results for "${searchQuery}"`);
          failedTracks++;
          await delay(YOUTUBE_DELAY_MS);
          continue;
        }

        videoId = searchData.items[0].id.videoId;
        
        // Queue for batch caching (non-blocking)
        resultsToCache.push({ title: track.title, artist: track.artist, platformId: videoId });
        
        // Delay only needed for API calls, not cache hits
        await delay(YOUTUBE_DELAY_MS);
      }

      // Add video to playlist
      const addResponse = await fetch(`${YOUTUBE_API_BASE}/playlistItems?part=snippet`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            playlistId: youtubePlaylistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        })
      });

      if (addResponse.ok) {
        addedTracks++;
      } else {
        const errorText = await addResponse.text();
        console.error(`[export-jobs-process] Failed to add video ${videoId}:`, errorText);
        
        // Retry once on certain errors
        if (addResponse.status === 409 || addResponse.status === 503 || addResponse.status === 429) {
          await delay(2000);
          const retryResponse = await fetch(`${YOUTUBE_API_BASE}/playlistItems?part=snippet`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              snippet: {
                playlistId: youtubePlaylistId,
                resourceId: { kind: 'youtube#video', videoId }
              }
            })
          });
          if (retryResponse.ok) {
            addedTracks++;
          } else {
            failedTracks++;
          }
        } else {
          failedTracks++;
        }
      }
    } catch (err) {
      console.error(`[export-jobs-process] Error processing YouTube track "${track.title}":`, err);
      failedTracks++;
    }

    // Update progress with cache stats
    const progress = 20 + Math.floor((i / tracks.length) * 75);
    await updateJobProgress(jobId, {
      current_step: `Adding videos... (${i + 1}/${tracks.length}, ${cacheHits} cached)`,
      progress,
      exported_tracks: addedTracks,
      failed_tracks: failedTracks
    });

    // Small delay for cache hits to avoid YouTube playlist API rate limits
    const wasCacheHit = getCachedIdFromMap(cacheMap, track.title, track.artist) !== null;
    if (wasCacheHit) {
      await delay(300); // Faster for cache hits
    }
  }
  
  // Batch cache all new results in background (non-blocking)
  if (resultsToCache.length > 0) {
    batchCacheSearchResults(resultsToCache, 'youtube');
  }
  
  console.log(`[export-jobs-process] 📊 YouTube cache stats: ${cacheHits} hits, ${cacheMisses} misses`);

  // Mark as completed
  await updateJobProgress(jobId, {
    status: 'completed',
    progress: 100,
    current_step: 'Export completed successfully!',
    completed_at: new Date().toISOString(),
    exported_tracks: addedTracks,
    failed_tracks: failedTracks
  });
}

async function processJob(job) {
  const { id: jobId, user_id, platform, source_type, source_id, playlist_id, playlist_name, playlist_description, is_public, is_collaborative } = job;
  
  console.log(`[export-jobs-process] Processing ${platform} job ${jobId} for user ${user_id}`);
  
  try {
    // Mark as processing
    await updateJobProgress(jobId, {
      status: 'processing',
      started_at: new Date().toISOString(),
      current_step: `Fetching ${platform === 'youtube' ? 'YouTube' : 'Spotify'} credentials...`
    });

    // Get user's access token
    const { data: userSession } = await getSupabaseAdmin().auth.admin.getUserById(user_id);
    if (!userSession?.user) {
      throw new Error('User not found');
    }

    // Create a client that can access the user's tokens
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let accessToken;
    try {
      if (platform === 'youtube') {
        accessToken = await getYouTubeToken(userSupabase, user_id);
      } else {
        accessToken = await getSpotifyToken(userSupabase, user_id);
      }
    } catch (e) {
      throw new Error(`${platform === 'youtube' ? 'YouTube' : 'Spotify'} not connected: ${e.message}`);
    }

    await updateJobProgress(jobId, { current_step: 'Fetching tracks from database...' });

    // Fetch tracks based on source type
    let tracks = [];
    let playlistNameFinal = playlist_name;

    if (source_type === 'community') {
      const { data: curatedSongs, error: songsError } = await getSupabaseAdmin()
        .from('curated_songs')
        .select('id, song_id, song_title, song_artist, platform')
        .eq('community_id', source_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (songsError) throw new Error(`Failed to fetch community songs: ${songsError.message}`);
      if (!curatedSongs?.length) throw new Error('No approved songs found in this community');

      tracks = curatedSongs.map(s => ({
        title: s.song_title,
        artist: s.song_artist,
        external_id: s.song_id,
        platform: s.platform
      }));
    } else {
      // Group export
      if (playlist_id === 'all') {
        const { data: playlists, error: playlistsError } = await getSupabaseAdmin()
          .from('group_playlists')
          .select(`
            id, name, platform, smart_sorted_order,
            playlist_songs (id, title, artist, external_id, position, smart_sorted_order)
          `)
          .eq('group_id', source_id)
          .order('smart_sorted_order', { ascending: true, nullsLast: true });

        if (playlistsError) throw new Error(`Failed to fetch playlists: ${playlistsError.message}`);
        if (!playlists?.length) throw new Error('No playlists found in group');

        playlists.forEach(p => {
          if (p.playlist_songs?.length) {
            p.playlist_songs.forEach(song => {
              tracks.push({
                ...song,
                playlist_platform: p.platform,
                playlist_order: p.smart_sorted_order ?? 1000
              });
            });
          }
        });

        tracks.sort((a, b) => {
          if (a.playlist_order !== b.playlist_order) return a.playlist_order - b.playlist_order;
          if (a.smart_sorted_order !== null && b.smart_sorted_order !== null) {
            return a.smart_sorted_order - b.smart_sorted_order;
          }
          return (a.position || 0) - (b.position || 0);
        });
      } else {
        const { data: playlist, error: playlistError } = await getSupabaseAdmin()
          .from('group_playlists')
          .select(`
            id, name, platform,
            playlist_songs (id, title, artist, external_id, position, smart_sorted_order)
          `)
          .eq('id', playlist_id)
          .single();

        if (playlistError) throw new Error(`Playlist not found: ${playlistError.message}`);
        
        playlistNameFinal = playlist_name || playlist.name;
        tracks = (playlist.playlist_songs || []).sort((a, b) => {
          if (a.smart_sorted_order !== null && b.smart_sorted_order !== null) {
            return a.smart_sorted_order - b.smart_sorted_order;
          }
          return (a.position || 0) - (b.position || 0);
        }).map(s => ({ ...s, playlist_platform: playlist.platform }));
      }
    }

    if (!tracks.length) throw new Error('No tracks to export');

    // Branch based on platform
    if (platform === 'youtube') {
      await processYouTubeExport(jobId, tracks, accessToken, playlistNameFinal, playlist_description);
    } else {
      await processSpotifyExport(jobId, tracks, accessToken, playlistNameFinal, playlist_description, is_public, is_collaborative);
    }

    console.log(`[export-jobs-process] Job ${jobId} completed`);

  } catch (error) {
    console.error(`[export-jobs-process] Job ${jobId} failed:`, error);
    
    await updateJobProgress(jobId, {
      status: 'failed',
      current_step: 'Export failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    });
  }
}

/**
 * POST /api/export-jobs/process
 * Process pending export jobs
 * 
 * Can be called with a specific jobId or will process the next pending job
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { jobId } = body;

    let job;

    if (jobId) {
      // Process specific job
      const { data, error } = await getSupabaseAdmin()
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .in('status', ['pending', 'processing'])
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Job not found or already processed' }, { status: 404 });
      }
      job = data;
    } else {
      // Get next pending job (respecting rate limit backoff)
      const { data, error } = await getSupabaseAdmin()
        .from('export_jobs')
        .select('*')
        .eq('status', 'pending')
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json({ message: 'No pending jobs to process' });
      }
      job = data;
    }

    // Process the job (don't await - let it run in background)
    processJob(job).catch(err => {
      console.error(`[export-jobs-process] Unhandled error in job ${job.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'Job processing started',
      jobId: job.id
    });
  } catch (error) {
    console.error('[export-jobs-process] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/export-jobs/process
 * Health check / status endpoint for the processor
 */
export async function GET() {
  try {
    // Count jobs by status
    const { data: pending } = await getSupabaseAdmin()
      .from('export_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: processing } = await getSupabaseAdmin()
      .from('export_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing');

    return NextResponse.json({
      status: 'ok',
      pendingJobs: pending?.length || 0,
      processingJobs: processing?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

