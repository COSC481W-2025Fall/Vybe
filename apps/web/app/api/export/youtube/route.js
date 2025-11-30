import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

/**
 * Helper function to pause execution
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add a video to a YouTube playlist with retry logic
 * @param {string} accessToken - YouTube API access token
 * @param {string} youtubePlaylistId - The playlist to add to
 * @param {string} videoId - The video ID to add
 * @param {number} maxRetries - Maximum number of retries (default: 1)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function addVideoToPlaylistWithRetry(accessToken, youtubePlaylistId, videoId, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const addVideoResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              playlistId: youtubePlaylistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId,
              },
            },
          }),
        }
      );

      if (addVideoResponse.ok) {
        return { success: true };
      }

      const errorText = await addVideoResponse.text();
      const statusCode = addVideoResponse.status;

      // Check if this is a retryable error (409 ABORTED, 503 SERVICE_UNAVAILABLE, 429 TOO_MANY_REQUESTS)
      const isRetryable = statusCode === 409 || statusCode === 503 || statusCode === 429;

      if (isRetryable && attempt < maxRetries) {
        console.log(`[Export YouTube] Retryable error (${statusCode}) for video ${videoId}, waiting 2s before retry...`);
        await sleep(2000); // Wait 2 seconds before retry
        continue;
      }

      // Final failure
      console.error(`[Export YouTube] Failed to add video ${videoId} after ${attempt + 1} attempt(s):`, errorText);
      return { success: false, error: errorText };

    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`[Export YouTube] Network error for video ${videoId}, waiting 2s before retry...`);
        await sleep(2000);
        continue;
      }
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * POST /api/export/youtube
 * Export a playlist to YouTube
 * 
 * Request Body (new format):
 * - sourceType: 'group' | 'community' (default: 'group')
 * - sourceId: string (ID of the group or community)
 * - playlistId: string (optional for groups - ID of specific playlist, or 'all')
 * - customName: string (optional) - Custom name for the exported playlist
 * 
 * Request Body (legacy format - still supported):
 * - playlistId: string (ID of the playlist to export, or 'all' for combined playlists)
 * - groupId: string (ID of the group containing the playlist)
 * - customName: string (optional)
 * 
 * Returns:
 * - 200: Success with songs data
 * - 400: Bad request (missing required fields)
 * - 401: Unauthorized (user not logged in)
 * - 404: Playlist not found
 * - 500: Server error
 */
export async function POST(request) {
  try {
    // Step 1: Authenticate user
    const supabase = await makeSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Export YouTube] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json();
    
    // Support both new format (sourceType/sourceId) and legacy format (groupId/playlistId)
    let sourceType = body.sourceType || 'group';
    let sourceId = body.sourceId;
    let playlistId = body.playlistId;
    const customName = body.customName;
    
    // Legacy format support: if groupId is provided but not sourceId, use groupId
    if (!sourceId && body.groupId) {
      sourceId = body.groupId;
      sourceType = 'group';
    }

    // Validate required fields based on sourceType
    if (sourceType === 'group') {
      if (!playlistId) {
        return NextResponse.json(
          { error: 'Missing required field: playlistId' },
          { status: 400 }
        );
      }
      if (!sourceId) {
        return NextResponse.json(
          { error: 'Missing required field: sourceId (or groupId)' },
          { status: 400 }
        );
      }
    } else if (sourceType === 'community') {
      if (!sourceId) {
        return NextResponse.json(
          { error: 'Missing required field: sourceId (community ID)' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Invalid sourceType: ${sourceType}. Must be 'group' or 'community'` },
        { status: 400 }
      );
    }

    // Step 3: Fetch songs based on sourceType
    let songs = [];
    let sourceName = '';

    if (sourceType === 'community') {
      // Fetch approved songs from the community's curated_songs table
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('id, name')
        .eq('id', sourceId)
        .single();

      if (communityError || !community) {
        console.error('[Export YouTube] Community not found:', communityError);
        return NextResponse.json(
          { error: 'Community not found' },
          { status: 404 }
        );
      }

      sourceName = community.name;

      // Fetch approved curated songs for this community
      const { data: curatedSongs, error: songsError } = await supabase
        .from('curated_songs')
        .select('id, song_id, song_title, song_artist, song_thumbnail, song_duration, platform, created_at')
        .eq('community_id', sourceId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (songsError) {
        console.error('[Export YouTube] Error fetching curated songs:', songsError);
        return NextResponse.json(
          { 
            error: 'Failed to fetch community songs',
            details: songsError.message,
            code: songsError.code
          },
          { status: 500 }
        );
      }

      if (!curatedSongs || curatedSongs.length === 0) {
        return NextResponse.json(
          { error: 'No approved songs found in this community' },
          { status: 404 }
        );
      }

      // Map curated_songs fields to the common format used for export
      songs = curatedSongs.map(song => ({
        id: song.id,
        title: song.song_title,
        artist: song.song_artist,
        duration: song.song_duration,
        thumbnail_url: song.song_thumbnail,
        external_id: song.song_id,
        platform: song.platform,
        created_at: song.created_at
      }));

    } else {
      // sourceType === 'group' - existing logic
      if (playlistId === 'all') {
        // Fetch all playlists in the group first
        const { data: groupPlaylists, error: playlistsError } = await supabase
          .from('group_playlists')
          .select('id')
          .eq('group_id', sourceId);

        if (playlistsError) {
          console.error('[Export YouTube] Error fetching group playlists:', playlistsError);
          return NextResponse.json(
            { error: 'Failed to fetch group playlists' },
            { status: 500 }
          );
        }

        if (!groupPlaylists || groupPlaylists.length === 0) {
          return NextResponse.json(
            { error: 'No playlists found in this group' },
            { status: 404 }
          );
        }

        const playlistIds = groupPlaylists.map(p => p.id);

        // Fetch all songs from all playlists in the group
        const { data: allSongs, error: songsError } = await supabase
          .from('playlist_songs')
          .select('id, title, artist, duration, thumbnail_url, external_id, playlist_id, position, created_at')
          .in('playlist_id', playlistIds)
          .order('created_at', { ascending: true });

        if (songsError) {
          console.error('[Export YouTube] Error fetching songs:', songsError);
          return NextResponse.json(
            { 
              error: 'Failed to fetch playlist songs',
              details: songsError.message,
              code: songsError.code
            },
            { status: 500 }
          );
        }

        songs = allSongs || [];
      } else {
        // Fetch songs from a specific playlist
        const { data: playlistSongs, error: songsError } = await supabase
          .from('playlist_songs')
          .select('id, title, artist, duration, thumbnail_url, external_id, playlist_id, position, created_at')
          .eq('playlist_id', playlistId)
          .order('position', { ascending: true });

        if (songsError) {
          console.error('[Export YouTube] Error fetching songs:', songsError);
          return NextResponse.json(
            { 
              error: 'Failed to fetch playlist songs',
              details: songsError.message,
              code: songsError.code
            },
            { status: 500 }
          );
        }

        songs = playlistSongs || [];
      }
    }

    // Step 4: Create YouTube playlist
    // Determine playlist title
    let playlistTitle;
    
    // If customName is provided and not empty, use it
    if (customName && customName.trim() !== '') {
      playlistTitle = customName.trim();
    } else if (sourceType === 'community') {
      // For communities, use the community name
      playlistTitle = `[Vybe Export] ${sourceName || 'Community Playlist'}`;
    } else {
      // For groups, use the default naming logic
      if (playlistId === 'all') {
        // For combined playlists, get the group name
        const { data: groupData } = await supabase
          .from('groups')
          .select('name')
          .eq('id', sourceId)
          .single();
        
        playlistTitle = `[Vybe Export] ${groupData?.name || 'Group Playlist'}`;
      } else {
        // For individual playlists, get the playlist name
        const { data: playlistData } = await supabase
          .from('group_playlists')
          .select('name')
          .eq('id', playlistId)
          .single();
        
        playlistTitle = `[Vybe Export] ${playlistData?.name || 'Playlist'}`;
      }
    }

    // Get YouTube access token
    let accessToken;
    try {
      accessToken = await getValidAccessToken(supabase, user.id);
    } catch (error) {
      console.error('[Export YouTube] Failed to get access token:', error);
      console.error('[Export YouTube] Error details:', error.message, error.stack);
      
      // Check if user has YouTube tokens in database
      const { data: tokenCheck, error: tokenError } = await supabase
        .from('youtube_tokens')
        .select('user_id, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return NextResponse.json(
        { 
          error: 'Failed to get YouTube access token',
          details: error.message,
          hint: tokenCheck ? 'Tokens exist but may be invalid' : 'No YouTube tokens found. Please connect your YouTube account in settings.'
        },
        { status: 401 }
      );
    }

    // Call YouTube API directly to create playlist
    const createPlaylistResponse = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: playlistTitle,
          description: `Exported from Vybe on ${new Date().toLocaleDateString()}`,
        },
        status: {
          privacyStatus: 'private', // Create as private by default
        },
      }),
    });

    if (!createPlaylistResponse.ok) {
      const errorText = await createPlaylistResponse.text();
      console.error('[Export YouTube] Failed to create playlist:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to create YouTube playlist',
          details: errorText
        },
        { status: 500 }
      );
    }

    const youtubePlaylist = await createPlaylistResponse.json();
    const youtubePlaylistId = youtubePlaylist.id;

    // Step 5: Search for songs and add them to the YouTube playlist
    const addResults = {
      successful: [],
      failed: [],
      skipped: []
    };

    for (const song of songs) {
      try {
        // Build search query: "artist - title" or just "title" if no artist
        const searchQuery = song.artist 
          ? `${song.artist} - ${song.title}`
          : song.title;

        // Search YouTube for the song
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(searchQuery)}&maxResults=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`[Export YouTube] Search failed for "${searchQuery}":`, errorText);
          addResults.failed.push({
            song: `${song.artist} - ${song.title}`,
            reason: 'Search failed',
            error: errorText
          });
          // Throttle even on failure to avoid hammering the API
          await sleep(1000);
          continue;
        }

        const searchData = await searchResponse.json();

        // Check if we found any results
        if (!searchData.items || searchData.items.length === 0) {
          addResults.failed.push({
            song: `${song.artist} - ${song.title}`,
            reason: 'No YouTube results found'
          });
          // Throttle even on failure
          await sleep(1000);
          continue;
        }

        const videoId = searchData.items[0].id.videoId;

        // Add the video to the playlist with retry logic
        const addResult = await addVideoToPlaylistWithRetry(
          accessToken,
          youtubePlaylistId,
          videoId,
          1 // maxRetries: retry once on failure
        );

        if (addResult.success) {
          addResults.successful.push({
            song: `${song.artist} - ${song.title}`,
            videoId
          });
        } else {
          addResults.failed.push({
            song: `${song.artist} - ${song.title}`,
            videoId,
            reason: 'Failed to add to playlist',
            error: addResult.error
          });
        }

        // Throttle: wait 1 second between each request to avoid rate limits
        // Reliability > Speed
        await sleep(1000);

      } catch (error) {
        console.error(`[Export YouTube] Error processing song "${song.title}":`, error);
        addResults.failed.push({
          song: `${song.artist} - ${song.title}`,
          reason: 'Unexpected error',
          error: error.message
        });
        // Throttle even on unexpected errors
        await sleep(1000);
      }
    }

    // Step 6: Return success with detailed results
    return NextResponse.json(
      { 
        message: 'YouTube playlist export completed',
        sourceType,
        sourceId,
        playlistId: playlistId || null,
        // Legacy field for backward compatibility
        groupId: sourceType === 'group' ? sourceId : undefined,
        youtubePlaylistId,
        youtubePlaylistUrl: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`,
        playlistTitle,
        totalSongs: songs.length,
        songsAdded: addResults.successful.length,
        songsFailed: addResults.failed.length,
        results: {
          successful: addResults.successful,
          failed: addResults.failed
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Export YouTube] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

