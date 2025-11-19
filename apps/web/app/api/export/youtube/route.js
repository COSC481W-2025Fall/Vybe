import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * POST /api/export/youtube
 * Export a playlist to YouTube
 * 
 * Request Body:
 * - playlistId: string (ID of the playlist to export, or 'all' for combined playlists)
 * - groupId: string (ID of the group containing the playlist)
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

    console.log('[Export YouTube] Authenticated user:', user.id);

    // Step 2: Parse and validate request body
    const body = await request.json();
    const { playlistId, groupId } = body;

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Missing required field: playlistId' },
        { status: 400 }
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing required field: groupId' },
        { status: 400 }
      );
    }

    console.log('[Export YouTube] Request:', { playlistId, groupId, userId: user.id });

    // Step 3: Fetch playlist songs from database
    let songs = [];

    if (playlistId === 'all') {
      // Fetch all playlists in the group first
      const { data: groupPlaylists, error: playlistsError } = await supabase
        .from('group_playlists')
        .select('id')
        .eq('group_id', groupId);

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

    console.log(`[Export YouTube] Found ${songs.length} songs`);

    // Step 4: Create YouTube playlist
    // Determine playlist title
    let playlistTitle;
    if (playlistId === 'all') {
      // For combined playlists, get the group name
      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
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

    console.log(`[Export YouTube] Creating YouTube playlist: "${playlistTitle}"`);

    // Get YouTube access token
    console.log('[Export YouTube] Attempting to get YouTube access token for user:', user.id);
    
    let accessToken;
    try {
      accessToken = await getValidAccessToken(supabase, user.id);
      console.log('[Export YouTube] Successfully got access token');
    } catch (error) {
      console.error('[Export YouTube] Failed to get access token:', error);
      console.error('[Export YouTube] Error details:', error.message, error.stack);
      
      // Check if user has YouTube tokens in database
      const { data: tokenCheck, error: tokenError } = await supabase
        .from('youtube_tokens')
        .select('user_id, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('[Export YouTube] Token check result:', { tokenCheck, tokenError });
      
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

    console.log(`[Export YouTube] Created YouTube playlist ID: ${youtubePlaylistId}`);

    // Step 5: Search for songs and add them to the YouTube playlist
    const addResults = {
      successful: [],
      failed: [],
      skipped: []
    };

    console.log(`[Export YouTube] Starting to add ${songs.length} songs to playlist`);

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      console.log(`[Export YouTube] Processing song ${i + 1}/${songs.length}: "${song.title}" by "${song.artist}"`);

      try {
        // Build search query: "artist - title" or just "title" if no artist
        const searchQuery = song.artist 
          ? `${song.artist} - ${song.title}`
          : song.title;

        console.log(`[Export YouTube] Searching for: "${searchQuery}"`);

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
          continue;
        }

        const searchData = await searchResponse.json();

        // Check if we found any results
        if (!searchData.items || searchData.items.length === 0) {
          console.log(`[Export YouTube] No results found for "${searchQuery}"`);
          addResults.failed.push({
            song: `${song.artist} - ${song.title}`,
            reason: 'No YouTube results found'
          });
          continue;
        }

        const videoId = searchData.items[0].id.videoId;
        console.log(`[Export YouTube] Found video ID: ${videoId}`);

        // Add the video to the playlist
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

        if (!addVideoResponse.ok) {
          const errorText = await addVideoResponse.text();
          console.error(`[Export YouTube] Failed to add video ${videoId}:`, errorText);
          addResults.failed.push({
            song: `${song.artist} - ${song.title}`,
            videoId,
            reason: 'Failed to add to playlist',
            error: errorText
          });
          continue;
        }

        console.log(`[Export YouTube] Successfully added: "${song.title}"`);
        addResults.successful.push({
          song: `${song.artist} - ${song.title}`,
          videoId
        });

        // Small delay to avoid rate limits (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[Export YouTube] Error processing song "${song.title}":`, error);
        addResults.failed.push({
          song: `${song.artist} - ${song.title}`,
          reason: 'Unexpected error',
          error: error.message
        });
      }
    }

    console.log(`[Export YouTube] Finished adding songs. Success: ${addResults.successful.length}, Failed: ${addResults.failed.length}`);

    // Step 6: Return success with detailed results
    return NextResponse.json(
      { 
        message: 'YouTube playlist export completed',
        playlistId,
        groupId,
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

