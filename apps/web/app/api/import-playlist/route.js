import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/youtube';

export async function POST(request) {
  try {
    const supabase = supabaseServer();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, platform, playlistUrl, userId } = body;

    if (!groupId || !platform || !playlistUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is a member of the group
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = group.owner_id === session.user.id || await checkGroupMembership(supabase, groupId, session.user.id);

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Check if user already has a playlist in this group
    const { data: existingPlaylists } = await supabase
      .from('group_playlists')
      .select('id')
      .eq('group_id', groupId)
      .eq('added_by', session.user.id);

    // If user already has a playlist, delete it (cascade will delete songs)
    if (existingPlaylists && existingPlaylists.length > 0) {
      console.log(`[import-playlist] User already has ${existingPlaylists.length} playlist(s), removing old ones...`);

      for (const oldPlaylist of existingPlaylists) {
        await supabase
          .from('group_playlists')
          .delete()
          .eq('id', oldPlaylist.id);
      }
    }

    // Import playlist based on platform
    let playlistData;
    if (platform === 'youtube') {
      playlistData = await importYouTubePlaylist(supabase, playlistUrl, session.user.id);
    } else if (platform === 'spotify') {
      playlistData = await importSpotifyPlaylist(supabase, playlistUrl, session.user.id);
    } else {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Create group_playlist entry
    const { data: groupPlaylist, error: playlistError } = await supabase
      .from('group_playlists')
      .insert({
        group_id: groupId,
        name: playlistData.name,
        platform,
        playlist_url: playlistUrl,
        playlist_id: playlistData.id,
        track_count: playlistData.tracks.length,
        added_by: session.user.id,
      })
      .select()
      .single();

    if (playlistError) {
      console.error('Error creating group playlist:', playlistError);
      return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
    }

    // Insert all songs
    const songs = playlistData.tracks.map((track, index) => ({
      playlist_id: groupPlaylist.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      thumbnail_url: track.thumbnail,
      external_id: track.id,
      position: index,
    }));

    const { error: songsError } = await supabase
      .from('playlist_songs')
      .insert(songs);

    if (songsError) {
      console.error('Error inserting songs:', songsError);
      // Clean up the playlist if songs failed to insert
      await supabase.from('group_playlists').delete().eq('id', groupPlaylist.id);
      return NextResponse.json({ error: 'Failed to import songs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      playlist: groupPlaylist,
      trackCount: songs.length,
    });

  } catch (error) {
    console.error('Error importing playlist:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import playlist' },
      { status: 500 }
    );
  }
}

async function checkGroupMembership(supabase, groupId, userId) {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

async function importYouTubePlaylist(supabase, playlistUrl, userId) {
  // Extract playlist ID from URL
  const playlistId = extractYouTubePlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error('Invalid YouTube playlist URL');
  }

  // Get access token
  const accessToken = await getValidAccessToken(supabase, userId);

  // Fetch playlist details
  const playlistResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!playlistResponse.ok) {
    throw new Error('Failed to fetch YouTube playlist');
  }

  const playlistData = await playlistResponse.json();
  if (!playlistData.items || playlistData.items.length === 0) {
    throw new Error('Playlist not found');
  }

  const playlist = playlistData.items[0];

  // Fetch all playlist items (videos)
  const tracks = [];
  let nextPageToken = null;
  let pageCount = 0;

  do {
    const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;

    console.log(`[YouTube Import] Fetching page ${pageCount + 1} for playlist ${playlistId}`);

    const itemsResponse = await fetch(itemsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      console.error(`[YouTube Import] Failed to fetch page ${pageCount + 1}:`, errorText);
      throw new Error('Failed to fetch playlist items');
    }

    const itemsData = await itemsResponse.json();
    console.log(`[YouTube Import] Page ${pageCount + 1}: Found ${itemsData.items?.length || 0} items`);

    // Filter out videos without valid IDs first
    const validItems = itemsData.items.filter(item =>
      item.contentDetails?.videoId &&
      item.snippet?.title !== 'Private video' &&
      item.snippet?.title !== 'Deleted video'
    );

    // Get video durations (requires separate API call)
    if (validItems.length > 0) {
      const videoIds = validItems.map(item => item.contentDetails.videoId).join(',');
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const videosData = await videosResponse.json();
      const durationMap = {};
      videosData.items?.forEach(video => {
        durationMap[video.id] = parseYouTubeDuration(video.contentDetails.duration);
      });

      validItems.forEach(item => {
        tracks.push({
          id: item.contentDetails.videoId,
          title: item.snippet.title,
          artist: item.snippet.videoOwnerChannelTitle || 'Unknown',
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          duration: durationMap[item.contentDetails.videoId] || 0,
        });
      });
    }

    nextPageToken = itemsData.nextPageToken;
    pageCount++;

    console.log(`[YouTube Import] Total tracks so far: ${tracks.length}, Next page token: ${nextPageToken ? 'exists' : 'none'}`);
  } while (nextPageToken);

  return {
    id: playlistId,
    name: playlist.snippet.title,
    tracks,
  };
}

// SSRF protection: validate and return only allowed Spotify URLs
// This function ensures that only Spotify domains can be accessed, preventing SSRF attacks
function validateSpotifyUrl(urlString) {
  const allowedHostnames = ['open.spotify.com', 'spotify.link', 'spoti.fi', 'play.spotify.com'];
  
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('Invalid URL format');
  }
  
  // Handle Spotify URI format (spotify:playlist:...) - these are safe, no network request needed
  if (urlString.startsWith('spotify:playlist:')) {
    return urlString; // URIs don't need validation, they're not URLs
  }
  
  let url;
  try {
    url = new URL(urlString);
  } catch (error) {
    throw new Error('Invalid URL format');
  }
  
  const hostname = url.hostname.toLowerCase();
  
  // Check if hostname matches any allowed domain (exact match or subdomain)
  const isAllowed = allowedHostnames.some(allowed => 
    hostname === allowed || hostname.endsWith('.' + allowed)
  );
  
  if (!isAllowed) {
    throw new Error(`Invalid Spotify URL. Only Spotify domains are allowed: ${allowedHostnames.join(', ')}`);
  }
  
  // Return validated URL string - safe to use in fetch calls
  return url.href;
}

async function importSpotifyPlaylist(supabase, playlistUrl, userId) {
  // SSRF protection: validate URL before any use
  const validatedUrl = validateSpotifyUrl(playlistUrl);

  // Handle Spotify short links by following redirects
  // Skip for Spotify URIs (spotify:playlist:...) as they don't need network requests
  let resolvedUrl = validatedUrl;
  if (!validatedUrl.startsWith('spotify:') && (validatedUrl.includes('spotify.link/') || validatedUrl.includes('spoti.fi/'))) {
    try {
      // SSRF protection: Explicit allowlist validation before fetch
      // CodeQL requires inline validation to recognize the URL as safe
      const ALLOWED_SPOTIFY_HOSTS = ['open.spotify.com', 'spotify.link', 'spoti.fi', 'play.spotify.com'];
      const urlObj = new URL(validatedUrl);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Explicit allowlist check - only proceed if hostname matches allowed domains
      const isHostAllowed = ALLOWED_SPOTIFY_HOSTS.some(allowed => 
        hostname === allowed || hostname.endsWith('.' + allowed)
      );
      
      if (!isHostAllowed) {
        throw new Error(`SSRF protection: Hostname ${hostname} not in allowlist`);
      }
      
      // At this point, urlObj.href is guaranteed to be a Spotify domain
      // codeql[js/ssrf]: URL validated against allowlist of Spotify domains only
      const response = await fetch(urlObj.href, { 
        method: 'HEAD', 
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (response.ok && response.url) {
        // Validate the resolved URL as well to prevent SSRF through redirects
        const validatedResolvedUrl = validateSpotifyUrl(response.url);
        resolvedUrl = validatedResolvedUrl;
      }
    } catch (error) {
      console.warn('[Spotify Import] Failed to resolve short link, trying original URL:', error);
      // If it's a validation error, re-throw it
      if (error.message.includes('Invalid Spotify URL') || error.message.includes('Invalid URL format') || error.message.includes('SSRF protection')) {
        throw error;
      }
      // Continue with original validated URL - extractSpotifyPlaylistId might still work
    }
  }

  // Extract playlist ID from URL
  const playlistId = extractSpotifyPlaylistId(resolvedUrl);

  // Validate playlist ID against Spotify spec (typically 22 chars, base62)
  if (!playlistId || !isValidSpotifyPlaylistId(playlistId)) {
    throw new Error('Invalid Spotify playlist URL or ID. Please provide a valid Spotify playlist link.');
  }

  // Get Spotify access token
  const { data: tokenData } = await supabase
    .from('spotify_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (!tokenData?.access_token) {
    throw new Error('Spotify not connected');
  }

  // Fetch playlist details
  const playlistResponse = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  );

  if (!playlistResponse.ok) {
    throw new Error('Failed to fetch Spotify playlist');
  }

  const playlistData = await playlistResponse.json();

  // Fetch all tracks (handle pagination)
  const tracks = [];
  let nextUrl = playlistData.tracks.href;

  while (nextUrl) {
    const tracksResponse = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!tracksResponse.ok) {
      throw new Error('Failed to fetch playlist tracks');
    }

    const tracksData = await tracksResponse.json();

    tracksData.items.forEach(item => {
      if (item.track) {
        tracks.push({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          thumbnail: item.track.album.images[0]?.url,
          duration: Math.floor(item.track.duration_ms / 1000),
        });
      }
    });

    nextUrl = tracksData.next;
  }

  return {
    id: playlistId,
    name: playlistData.name,
    tracks,
  };
}

function extractYouTubePlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}


// Function to extract the Spotify playlist ID from the URL
// Addded for trending communities on homepage
function extractSpotifyPlaylistId(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim whitespace
  url = url.trim();

  // Handle Spotify URI format: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  const uriMatch = url.match(/^spotify:playlist:([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return uriMatch[1];
  }

  // Handle full URLs: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  // Also handles URLs with query params: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
  const urlMatch = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Handle alternative URL format: https://play.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  const altUrlMatch = url.match(/play\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (altUrlMatch) {
    return altUrlMatch[1];
  }

  // Handle just the ID itself (if it's a valid base62 string)
  // Spotify playlist IDs are typically 22 characters, but can vary
  const directIdMatch = url.match(/^([a-zA-Z0-9]{15,25})$/);
  if (directIdMatch) {
    return directIdMatch[1];
  }

  return null;
}

// Validate Spotify playlist ID (base62, typically 15-25 chars, most common is 22)
function isValidSpotifyPlaylistId(id) {
  if (!id || typeof id !== "string") {
    return false;
  }
  // Spotify playlist IDs are base62: [A-Za-z0-9], typically 15-25 characters
  // Most common is 22, but we'll be flexible and let the API validate
  return /^[A-Za-z0-9]{15,25}$/.test(id);
}

function parseYouTubeDuration(duration) {
  // Parse ISO 8601 duration format (PT1H2M3S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}
