// app/api/communities/[id]/playlist-songs/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/youtube';

// Get app-level Spotify access token (client credentials flow)
async function getSpotifyAppToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify app token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * GET /api/communities/[id]/playlist-songs
 * Fetch songs from all playlist links for a community
 * 
 * Query params:
 * - linkIndex: (optional) specific playlist link index to fetch
 * 
 * Returns:
 * - 200: Songs from playlist links
 * - 404: Community not found
 * - 500: Server error
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const linkIndex = searchParams.get('linkIndex');

    // Fetch community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const playlistLinks = community.playlist_links || [];
    
    if (playlistLinks.length === 0) {
      return NextResponse.json({
        success: true,
        songs: []
      });
    }

    // Fetch songs from specified link or all links
    const linksToFetch = linkIndex !== null 
      ? [playlistLinks[parseInt(linkIndex)]] 
      : playlistLinks;

    const allSongs = [];

    for (let idx = 0; idx < linksToFetch.length; idx++) {
      const link = linksToFetch[idx];
      const actualIndex = linkIndex !== null ? parseInt(linkIndex) : playlistLinks.indexOf(link);

      try {
        const songs = await fetchPlaylistSongs(link, user.id, supabase);
        
        // Check curation status for each song
        const songIds = songs.map(s => s.id);
        const { data: curatedSongs } = await supabase
          .from('curated_songs')
          .select('*')
          .eq('community_id', id)
          .eq('playlist_link_index', actualIndex)
          .in('song_id', songIds);

        const curatedMap = {};
        curatedSongs?.forEach(cs => {
          curatedMap[cs.song_id] = cs;
        });

        // Add curation status to songs
        songs.forEach(song => {
          const curated = curatedMap[song.id];
          allSongs.push({
            ...song,
            playlist_link_index: actualIndex,
            playlist_label: link.label || `${link.platform} playlist`,
            curation_status: curated?.status || 'pending',
            removal_reason: curated?.removal_reason || null,
            curated_at: curated?.curated_at || null
          });
        });
      } catch (error) {
        console.error(`Error fetching songs from playlist link ${actualIndex}:`, error);
        // Continue with other playlists even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      songs: allSongs
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to fetch songs from a playlist link
 */
async function fetchPlaylistSongs(link, userId, supabase) {
  if (link.platform === 'spotify') {
    return await fetchSpotifyPlaylistSongs(link.url, userId, supabase);
  } else if (link.platform === 'youtube') {
    return await fetchYouTubePlaylistSongs(link.url, userId, supabase);
  } else {
    throw new Error(`Unsupported platform: ${link.platform}`);
  }
}

async function fetchSpotifyPlaylistSongs(playlistUrl, userId, supabase) {
  // Extract playlist ID from URL
  const playlistId = extractSpotifyPlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error('Invalid Spotify playlist URL');
  }

  // Try to get access token - prefer app-level token for public playlists
  let accessToken = null;
  let useAppToken = true;

  try {
    // First, try app-level token (works for public playlists, available to all users)
    accessToken = await getSpotifyAppToken();
  } catch (appTokenError) {
    console.log('[fetchSpotifyPlaylistSongs] App token failed, trying user token:', appTokenError.message);
    useAppToken = false;
    
    // Fallback to user token if available (needed for private playlists)
    const { data: tokenData } = await supabase
      .from('spotify_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (tokenData?.access_token) {
      accessToken = tokenData.access_token;
    } else {
      // If no user token, try app token one more time as last resort
      try {
        accessToken = await getSpotifyAppToken();
        useAppToken = true;
      } catch (e) {
        throw new Error('Unable to access Spotify playlist. Public playlists should be accessible to all users.');
      }
    }
  }

  // Fetch playlist tracks
  const tracks = [];
  let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // If app token failed and we have a user token, try with user token
      if (useAppToken && response.status === 403) {
        const { data: tokenData } = await supabase
          .from('spotify_tokens')
          .select('access_token')
          .eq('user_id', userId)
          .single();

        if (tokenData?.access_token) {
          accessToken = tokenData.access_token;
          useAppToken = false;
          // Retry with user token
          continue;
        }
      }
      
      const errorText = await response.text();
      console.error('[fetchSpotifyPlaylistSongs] Failed to fetch playlist tracks:', response.status, errorText);
      throw new Error('Failed to fetch Spotify playlist tracks');
    }

    const data = await response.json();

    data.items.forEach(item => {
      if (item.track && item.track.id) {
        tracks.push({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          thumbnail: item.track.album.images[0]?.url,
          duration: Math.floor(item.track.duration_ms / 1000),
          platform: 'spotify',
          explicit: item.track.explicit || false
        });
      }
    });

    nextUrl = data.next;
  }

  return tracks;
}

async function fetchYouTubePlaylistSongs(playlistUrl, userId, supabase) {
  // Extract playlist ID from URL
  const playlistId = extractYouTubePlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error('Invalid YouTube playlist URL');
  }

  // Try to use API key first (works for public playlists, available to all users)
  const apiKey = process.env.YOUTUBE_API_KEY;
  let useApiKey = !!apiKey;
  let userAccessToken = null;

  // Try to get user token as fallback (for private playlists)
  try {
    userAccessToken = await getValidAccessToken(supabase, userId);
  } catch (e) {
    // User token not available - that's okay, we'll use API key
    console.log('[fetchYouTubePlaylistSongs] User token not available, using API key only');
  }

  // Fetch playlist items
  const tracks = [];
  let nextPageToken = null;

  do {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    
    let headers = {};
    
    if (useApiKey && apiKey) {
      // Use API key for public playlists
      url += `&key=${apiKey}`;
    } else if (userAccessToken) {
      // Fallback to user token if API key not available or failed
      headers.Authorization = `Bearer ${userAccessToken}`;
    } else {
      throw new Error('Unable to access YouTube playlist. Public playlists should be accessible to all users.');
    }
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      // If API key failed (might be private playlist), try user token
      if (useApiKey && response.status === 403 && userAccessToken) {
        useApiKey = false;
        // Retry this request with user token
        continue;
      }
      
      const errorText = await response.text();
      console.error('[fetchYouTubePlaylistSongs] Failed to fetch playlist items:', response.status, errorText);
      throw new Error('Failed to fetch YouTube playlist items');
    }

    const data = await response.json();

    data.items?.forEach(item => {
      if (item.contentDetails?.videoId && item.snippet?.title) {
        tracks.push({
          id: item.contentDetails.videoId,
          title: item.snippet.title,
          artist: item.snippet.videoOwnerChannelTitle || 'Unknown',
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          duration: 0, // YouTube duration requires separate API call
          platform: 'youtube',
          explicit: false // YouTube doesn't provide explicit flag
        });
      }
    });

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return tracks;
}

function extractSpotifyPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractYouTubePlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

