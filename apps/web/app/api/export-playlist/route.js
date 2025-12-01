import { NextResponse } from 'next/server';

import { cookies } from 'next/headers';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { getValidAccessToken } from '@/lib/spotify';

import { convertTracksToSpotifyUris } from '@/lib/services/spotifyExport';



const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';



/**

 * POST /api/export-playlist

 * Export a playlist to Spotify

 * 

 * Two modes:

 * 

 * Mode 1: Direct export (provide tracks as URIs)

 * {

 *   name: string (required) - Playlist name

 *   description?: string - Playlist description

 *   tracks: string[] (required) - Array of Spotify track URIs (format: "spotify:track:...")

 *   isPublic?: boolean - Whether playlist is public (default: false)

 *   isCollaborative?: boolean - Whether playlist is collaborative (default: false)

 * }

 * 

 * Mode 2: Export from database playlist

 * {

 *   playlistId: string (required) - UUID of group_playlist in database

 *   name?: string - Override playlist name (optional, uses database name if not provided)

 *   description?: string - Playlist description (optional)

 *   isPublic?: boolean - Whether playlist is public (default: false)

 *   isCollaborative?: boolean - Whether playlist is collaborative (default: false)

 * }

 * 

 * Returns:

 * {

 *   success: boolean

 *   playlist: {

 *     id: string

 *     name: string

 *     description: string

 *     external_urls: { spotify: string }

 *     uri: string

 *     tracks: { total: number }

 *   }

 *   stats?: {

 *     totalTracks: number

 *     exportedTracks: number

 *     missingTracks: number

 *   }

 * }

 */

export async function POST(request) {

  try {

    const cookieStore = await cookies();

    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });



    // Authenticate user

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }



    // Get Spotify access token

    let accessToken;

    try {

      accessToken = await getValidAccessToken(supabase, user.id);

    } catch (e) {

      return NextResponse.json(

        { 

          error: 'Spotify not connected',

          message: e.code === 'NO_TOKENS' 

            ? e.message 

            : 'Please connect your Spotify account in Settings'

        },

        { status: 401 }

      );

    }



    // Parse request body

    const body = await request.json();

    console.log('[export-playlist] Request body:', { 
      playlistId: body.playlistId, 
      groupId: body.groupId, 
      hasName: !!body.name 
    });

    const { 

      name, 

      description, 

      tracks, 

      playlistId, // Database playlist ID or 'all' for all playlists in group

      groupId, // Group ID (required when playlistId is 'all')

      isPublic = false, 

      isCollaborative = false 

    } = body;

    // Validate groupId when playlistId is 'all'

    if (playlistId === 'all' && !groupId) {

      console.error('[export-playlist] groupId is required when playlistId is "all"');

      return NextResponse.json(

        { error: 'groupId is required when exporting all playlists' },

        { status: 400 }

      );

    }



    let playlistName;

    let trackUris = tracks;

    let stats = null;



    // Mode 2: Export from database playlist

    if (playlistId) {

      let playlist;

      if (playlistId === 'all' && groupId) {

        // Export all playlists from group

        const { data: playlists, error: playlistsError } = await supabase

          .from('group_playlists')

          .select(`

            id,

            name,

            platform,

            smart_sorted_order,

            playlist_songs (

              id,

              title,

              artist,

              external_id,

              position,

              smart_sorted_order

            )

          `)

          .eq('group_id', groupId)

          .order('smart_sorted_order', { ascending: true, nullsLast: true })

          .order('created_at', { ascending: true });



        if (playlistsError || !playlists || playlists.length === 0) {

          return NextResponse.json(

            { error: 'No playlists found in group' },

            { status: 404 }

          );

        }



        // Merge all playlists into one virtual playlist

        const allSongs = [];

        console.log(`[export-playlist] Processing ${playlists.length} playlists for group ${groupId}`);

        playlists.forEach((p) => {

          if (!p.playlist_songs || !Array.isArray(p.playlist_songs)) {

            console.warn(`[export-playlist] Playlist ${p.id} (${p.name}) has no songs or invalid songs array`);

            return;

          }

          if (p.playlist_songs.length > 0) {

            p.playlist_songs.forEach(song => {

              if (!song) {

                console.warn(`[export-playlist] Skipping null/undefined song in playlist ${p.id}`);

                return;

              }

              allSongs.push({

                ...song,

                playlist_platform: p.platform,

                playlist_order: p.smart_sorted_order ?? 1000,

              });

            });

          }

        });

        console.log(`[export-playlist] Merged ${allSongs.length} songs from ${playlists.length} playlists`);



        // Sort songs: first by playlist order, then by song order within playlist

        allSongs.sort((a, b) => {

          if (a.playlist_order !== b.playlist_order) {

            return a.playlist_order - b.playlist_order;

          }

          if (a.smart_sorted_order !== null && b.smart_sorted_order !== null) {

            return a.smart_sorted_order - b.smart_sorted_order;

          }

          if (a.smart_sorted_order !== null) return -1;

          if (b.smart_sorted_order !== null) return 1;

          return a.position - b.position;

        });



        // Create virtual playlist object

        playlist = {

          id: 'all',

          name: name?.trim() || 'All Playlists',

          platform: 'mixed', // Mixed platform for all playlists

          playlist_songs: allSongs,

        };

      } else {

        // Fetch single playlist and tracks from database

        const { data: playlistData, error: playlistError } = await supabase

          .from('group_playlists')

          .select(`

            id,

            name,

            platform,

            playlist_songs (

              id,

              title,

              artist,

              external_id,

              position,

              smart_sorted_order

            )

          `)

          .eq('id', playlistId)

          .single();



        if (playlistError || !playlistData) {

          return NextResponse.json(

            { error: 'Playlist not found' },

            { status: 404 }

          );

        }



        playlist = playlistData;

      }

      // Validate playlist was created/fetched successfully

      if (!playlist) {

        return NextResponse.json(

          { error: 'Playlist not found' },

          { status: 404 }

        );

      }



      // Use provided name or fall back to database name

      playlistName = (name?.trim()) || playlist.name;



      // Get tracks, sorted by smart_sorted_order if available, otherwise by position

      const songs = (playlist.playlist_songs || []).sort((a, b) => {

        if (a.smart_sorted_order !== null && b.smart_sorted_order !== null) {

          return a.smart_sorted_order - b.smart_sorted_order;

        }

        if (a.smart_sorted_order !== null) return -1;

        if (b.smart_sorted_order !== null) return 1;

        return a.position - b.position;

      });



      if (songs.length === 0) {

        return NextResponse.json(

          { error: 'Playlist has no tracks' },

          { status: 400 }

        );

      }



      // Convert tracks to Spotify URIs

      const totalTracks = songs.length;

      console.log(`[export-playlist] Converting ${totalTracks} tracks to Spotify URIs (platform: ${playlist.platform})`);

      // For mixed playlists, convert each song based on its original platform

      if (playlist.platform === 'mixed') {

        try {

          const { trackIdToUri, searchSpotifyTrack } = await import('@/lib/services/spotifyExport');

          const uriPromises = songs.map(async (song, index) => {

            try {

              const platform = song.playlist_platform || 'youtube';

              if (platform === 'spotify' && song.external_id) {

                return trackIdToUri(song.external_id);

              } else {

                if (!song.title) {

                  console.warn(`[export-playlist] Song at index ${index} has no title, skipping`);

                  return null;

                }

                return await searchSpotifyTrack(song.title, song.artist, accessToken);

              }

            } catch (error) {

              console.error(`[export-playlist] Error converting song "${song.title}":`, error);

              return null;

            }

          });

          const uris = await Promise.all(uriPromises);

          trackUris = uris.filter(uri => uri !== null && uri !== undefined);

        } catch (error) {

          console.error('[export-playlist] Error in mixed platform conversion:', error);

          throw new Error(`Failed to convert tracks: ${error.message}`);

        }

      } else {

        try {

          trackUris = await convertTracksToSpotifyUris(songs, playlist.platform, accessToken);

        } catch (error) {

          console.error('[export-playlist] Error converting tracks:', error);

          throw new Error(`Failed to convert tracks: ${error.message}`);

        }

      }

      console.log(`[export-playlist] Successfully converted ${trackUris.length}/${totalTracks} tracks`);

      const exportedTracks = trackUris.length;

      const missingTracks = totalTracks - exportedTracks;



      stats = {

        totalTracks,

        exportedTracks,

        missingTracks,

      };



      if (trackUris.length === 0) {

        return NextResponse.json(

          { error: 'No tracks could be found on Spotify. Make sure the playlist contains Spotify tracks or that you have Spotify connected.' },

          { status: 400 }

        );

      }

    } else {

      // Mode 1: Direct export

      playlistName = name;

      

      // Validate required fields

      if (!playlistName || !playlistName.trim()) {

        return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });

      }



      if (!trackUris || !Array.isArray(trackUris) || trackUris.length === 0) {

        return NextResponse.json({ error: 'At least one track is required' }, { status: 400 });

      }



      // Validate track URIs format

      const trackUriPattern = /^spotify:track:[a-zA-Z0-9]{22}$/;

      const invalidTracks = trackUris.filter(uri => !trackUriPattern.test(uri));

      if (invalidTracks.length > 0) {

        return NextResponse.json(

          { error: `Invalid track URIs found. Format should be "spotify:track:..."` },

          { status: 400 }

        );

      }

    }



    // Validate playlist name before creating

    if (!playlistName || !playlistName.trim()) {

      console.error('[export-playlist] Playlist name is empty or invalid');

      return NextResponse.json(

        { error: 'Playlist name is required' },

        { status: 400 }

      );

    }

    // Step 1: Create the playlist using /me/playlists endpoint
    // According to Spotify API: https://developer.spotify.com/documentation/web-api/reference/create-playlist
    // Using /me/playlists is simpler and doesn't require fetching user_id first
    const playlistBody = {

      name: playlistName.trim(),

      public: isPublic,

      collaborative: isCollaborative,

    };

    // Description is optional, only include if provided

    if (description && description.trim()) {

      playlistBody.description = description.trim();

    }

    console.log('[export-playlist] Creating playlist:', { 

      name: playlistBody.name, 

      public: playlistBody.public,

      collaborative: playlistBody.collaborative 

    });

    const createPlaylistResponse = await fetch(

      `${SPOTIFY_API_BASE}/me/playlists`,

      {

        method: 'POST',

        headers: {

          Authorization: `Bearer ${accessToken}`,

          'Content-Type': 'application/json',

        },

        body: JSON.stringify(playlistBody),

      }

    );

    if (!createPlaylistResponse.ok) {

      let errorText;

      try {

        const errorData = await createPlaylistResponse.json();

        errorText = JSON.stringify(errorData);

        console.error('[export-playlist] Failed to create playlist:', {

          status: createPlaylistResponse.status,

          statusText: createPlaylistResponse.statusText,

          error: errorData

        });

      } catch (e) {

        errorText = await createPlaylistResponse.text();

        console.error('[export-playlist] Failed to create playlist (non-JSON error):', {

          status: createPlaylistResponse.status,

          statusText: createPlaylistResponse.statusText,

          error: errorText

        });

      }

      // Check if it's a 403 Forbidden error (likely missing scopes)
      if (createPlaylistResponse.status === 403) {
        return NextResponse.json(
          { 
            error: 'Insufficient Spotify permissions',
            message: 'Your Spotify account does not have permission to create playlists. Please reconnect your Spotify account in Settings to grant the necessary permissions.',
            details: errorText,
            requiresReconnect: true
          },
          { status: 403 }
        );
      }

      return NextResponse.json(

        { 

          error: 'Failed to create Spotify playlist', 

          message: `Spotify API returned ${createPlaylistResponse.status}: ${createPlaylistResponse.statusText}`,

          details: errorText 

        },

        { status: createPlaylistResponse.status }

      );

    }



    const createdPlaylist = await createPlaylistResponse.json();

    const spotifyPlaylistId = createdPlaylist.id;



    // Step 3: Add tracks to the playlist (Spotify allows up to 100 tracks per request)
    // According to Spotify API docs: https://developer.spotify.com/documentation/web-api/reference/create-playlist
    const batchSize = 100;
    const trackBatches = [];
    
    for (let i = 0; i < trackUris.length; i += batchSize) {
      trackBatches.push(trackUris.slice(i, i + batchSize));
    }

    // Add tracks in batches (position is optional - if not specified, tracks are added to the end)
    for (let i = 0; i < trackBatches.length; i++) {
      const batch = trackBatches[i];
      
      const addTracksResponse = await fetch(
        `${SPOTIFY_API_BASE}/playlists/${spotifyPlaylistId}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: batch,
            // Don't specify position - tracks will be added in order to the end of playlist
          }),
        }
      );

      if (!addTracksResponse.ok) {
        const errorText = await addTracksResponse.text();
        console.error(`[export-playlist] Failed to add tracks batch ${i + 1}/${trackBatches.length}:`, errorText);
        
        // If a batch fails, we should still try to continue with remaining batches
        // but log the error for debugging
        const errorData = await addTracksResponse.json().catch(() => ({ error: errorText }));
        console.error(`[export-playlist] Batch error details:`, errorData);
      }
    }



    return NextResponse.json({

      success: true,

      playlist: {

        id: createdPlaylist.id,

        name: createdPlaylist.name,

        description: createdPlaylist.description,

        external_urls: createdPlaylist.external_urls,

        uri: createdPlaylist.uri,

        tracks: {

          total: trackUris.length,

        },

      },

      ...(stats && { stats }),

    });



  } catch (error) {

    console.error('[export-playlist] Unexpected error:', error);
    console.error('[export-playlist] Error stack:', error.stack);

    return NextResponse.json(

      { 

        error: 'Internal server error', 

        message: error.message || 'An unexpected error occurred',

        details: process.env.NODE_ENV === 'development' ? error.stack : undefined

      },

      { status: 500 }

    );

  }

}
