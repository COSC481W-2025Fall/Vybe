import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getValidAccessToken } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

export async function POST(request) {
  try {
    const supabase = await makeSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
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

    const isMember = group.owner_id === user.id || await checkGroupMembership(supabase, groupId, user.id);

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Check if user already has a playlist in this group
    const { data: existingPlaylists } = await supabase
      .from('group_playlists')
      .select('id')
      .eq('group_id', groupId)
      .eq('added_by', user.id);

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
      playlistData = await importYouTubePlaylist(supabase, playlistUrl, user.id);
    } else if (platform === 'spotify') {
      playlistData = await importSpotifyPlaylist(supabase, playlistUrl, user.id);
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
        added_by: user.id,
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

    // Run smart sorting synchronously BEFORE returning response
    // This ensures the user sees the sorted order immediately
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('[import-playlist] Starting smart sort...');
        const { analyzeAndSortPlaylists } = await import('@/lib/services/openaiSorting');
        const { getTrackMetadata } = await import('@/lib/services/musicMetadata');
        const { updatePlaylistOrder, updateSongOrder } = await import('@/lib/db/smartSorting');
        
        // Fetch all playlists and songs
        const { data: allPlaylists } = await supabase
          .from('group_playlists')
          .select('*')
          .eq('group_id', groupId);

        if (allPlaylists && allPlaylists.length > 0) {
          const playlistIds = allPlaylists.map(p => p.id);
          const { data: allSongs } = await supabase
            .from('playlist_songs')
            .select('*')
            .in('playlist_id', playlistIds);

          if (allSongs && allSongs.length > 0) {
            // Get Spotify tokens
            const userIds = [...new Set(allPlaylists.map(p => p.added_by))];
            const { data: spotifyTokens } = await supabase
              .from('spotify_tokens')
              .select('user_id, access_token')
              .in('user_id', userIds);

            const tokenMap = {};
            spotifyTokens?.forEach(token => {
              tokenMap[token.user_id] = token.access_token;
            });

            // Fetch metadata from all sources (Spotify, Last.fm, MusicBrainz)
            console.log(`[import-playlist] Fetching metadata for ${allSongs.length} songs from Spotify, Last.fm, and MusicBrainz...`);
            const allSongsMetadata = [];
            for (const playlist of allPlaylists) {
              const songs = allSongs.filter(s => s.playlist_id === playlist.id);
              const spotifyToken = tokenMap[playlist.added_by] || null;

              for (const song of songs) {
                try {
                  const metadata = await getTrackMetadata(song, playlist.platform, spotifyToken);
                  if (metadata) {
                    allSongsMetadata.push({ 
                      ...metadata, 
                      songId: song.id, 
                      playlistId: playlist.id 
                    });
                  }
                  // Small delay between songs to avoid overwhelming APIs
                  await new Promise(resolve => setTimeout(resolve, 50));
                } catch (err) {
                  console.error(`[import-playlist] Error fetching metadata for song ${song.id}:`, err);
                  // Continue with basic song info
                  allSongsMetadata.push({
                    songId: song.id,
                    playlistId: playlist.id,
                    title: song.title,
                    artist: song.artist || 'Unknown Artist',
                    genres: [],
                    popularity: 0,
                    audioFeatures: {},
                    sources: [],
                  });
                }
              }
            }

            console.log(`[import-playlist] Fetched metadata for ${allSongsMetadata.length} songs. Analyzing with OpenAI...`);
            
            // Analyze and sort using OpenAI with all metadata
            const { playlistOrder, songOrders } = await analyzeAndSortPlaylists(
              groupId,
              allPlaylists,
              allSongsMetadata
            );

            // Update database with sorted order
            await updatePlaylistOrder(supabase, groupId, playlistOrder);
            await updateSongOrder(supabase, songOrders);
            
            console.log('[import-playlist] Smart sort completed successfully');
          }
        }
      } catch (error) {
        console.error('[import-playlist] Error in smart sort (non-fatal):', error);
        // Don't fail the import if sorting fails - user can still use the playlist
      }
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

async function importSpotifyPlaylist(supabase, playlistUrl, userId) {
  // Extract playlist ID from URL
  const playlistId = extractSpotifyPlaylistId(playlistUrl);

  // Validate playlist ID against Spotify spec (typically 22 chars, base62)
  if (!playlistId || !isValidSpotifyPlaylistId(playlistId)) {
    throw new Error('Invalid Spotify playlist URL or ID');
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

function extractSpotifyPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Validate Spotify playlist ID (base62, usually length 22)
function isValidSpotifyPlaylistId(id) {
  // Spotify playlist IDs are 22 characters, base62: [A-Za-z0-9]
  return typeof id === "string" && /^[A-Za-z0-9]{22}$/.test(id);
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
