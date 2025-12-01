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

    const { 

      name, 

      description, 

      tracks, 

      playlistId, // Database playlist ID

      isPublic = false, 

      isCollaborative = false 

    } = body;



    let playlistName;

    let trackUris = tracks;

    let stats = null;



    // Mode 2: Export from database playlist

    if (playlistId) {

      // Fetch playlist and tracks from database

      const { data: playlist, error: playlistError } = await supabase

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



      if (playlistError || !playlist) {

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

      trackUris = await convertTracksToSpotifyUris(songs, playlist.platform, accessToken);

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



    // Step 1: Get user's Spotify profile to get user_id

    const profileResponse = await fetch(`${SPOTIFY_API_BASE}/me`, {

      headers: {

        Authorization: `Bearer ${accessToken}`,

      },

    });



    if (!profileResponse.ok) {

      const errorText = await profileResponse.text();

      console.error('[export-playlist] Failed to get user profile:', errorText);

      return NextResponse.json(

        { error: 'Failed to get Spotify user profile' },

        { status: profileResponse.status }

      );

    }



    const profile = await profileResponse.json();

    const userId = profile.id;



    // Step 2: Create the playlist

    const createPlaylistResponse = await fetch(

      `${SPOTIFY_API_BASE}/users/${userId}/playlists`,

      {

        method: 'POST',

        headers: {

          Authorization: `Bearer ${accessToken}`,

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          name: playlistName.trim(),

          description: description?.trim() || '',

          public: isPublic,

          collaborative: isCollaborative,

        }),

      }

    );



    if (!createPlaylistResponse.ok) {

      const errorText = await createPlaylistResponse.text();

      console.error('[export-playlist] Failed to create playlist:', errorText);

      return NextResponse.json(

        { error: 'Failed to create Spotify playlist', details: errorText },

        { status: createPlaylistResponse.status }

      );

    }



    const createdPlaylist = await createPlaylistResponse.json();

    const spotifyPlaylistId = createdPlaylist.id;



    // Step 3: Add tracks to the playlist (Spotify allows up to 100 tracks per request)

    const batchSize = 100;

    const trackBatches = [];

    for (let i = 0; i < trackUris.length; i += batchSize) {

      trackBatches.push(trackUris.slice(i, i + batchSize));

    }



    // Add tracks in batches

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

            position: i * batchSize, // Maintain order

          }),

        }

      );



      if (!addTracksResponse.ok) {

        const errorText = await addTracksResponse.text();

        console.error(`[export-playlist] Failed to add tracks batch ${i + 1}:`, errorText);

        // Continue with other batches even if one fails

        // You might want to handle this differently based on your needs

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

    return NextResponse.json(

      { error: 'Internal server error', message: error.message },

      { status: 500 }

    );

  }

}
