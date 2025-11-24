import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getTrackMetadata } from '@/lib/services/musicMetadata';
import { analyzeAndSortPlaylists } from '@/lib/services/openaiSorting';
import { updatePlaylistOrder, updateSongOrder } from '@/lib/db/smartSorting';

/**
 * POST /api/groups/[groupId]/smart-sort
 * Triggers AI-powered sorting of playlists and songs in a group
 */
export async function POST(request, { params }) {
  try {
    const { groupId } = params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check if user is owner or member
    const { data: membership } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    const isOwner = group.owner_id === session.user.id;
    const isMember = isOwner || membership !== null;

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Fetch all playlists in the group
    const { data: playlists, error: playlistsError } = await supabase
      .from('group_playlists')
      .select('*')
      .eq('group_id', groupId);

    if (playlistsError) {
      console.error('[smart-sort] Error fetching playlists:', playlistsError);
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }

    if (!playlists || playlists.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No playlists to sort',
        playlistOrder: [],
        songOrders: {},
      });
    }

    // Fetch all songs from all playlists
    const playlistIds = playlists.map(p => p.id);
    const { data: allSongs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('*')
      .in('playlist_id', playlistIds);

    if (songsError) {
      console.error('[smart-sort] Error fetching songs:', songsError);
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
    }

    if (!allSongs || allSongs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No songs to sort',
        playlistOrder: playlists.map(p => ({ playlistId: p.id, order: 1 })),
        songOrders: {},
      });
    }

    // Get Spotify tokens for users who added playlists (for Spotify API access)
    const userIds = [...new Set(playlists.map(p => p.added_by))];
    const { data: spotifyTokens } = await supabase
      .from('spotify_tokens')
      .select('user_id, access_token')
      .in('user_id', userIds);

    const tokenMap = {};
    spotifyTokens?.forEach(token => {
      tokenMap[token.user_id] = token.access_token;
    });

    // Group songs by playlist and fetch metadata
    const songsByPlaylist = {};
    playlists.forEach(playlist => {
      songsByPlaylist[playlist.id] = allSongs.filter(s => s.playlist_id === playlist.id);
    });

    // Fetch metadata for all songs
    console.log(`[smart-sort] Fetching metadata for ${allSongs.length} songs...`);
    const allSongsMetadata = [];

    for (const playlist of playlists) {
      const songs = songsByPlaylist[playlist.id] || [];
      const spotifyToken = tokenMap[playlist.added_by] || null;

      for (const song of songs) {
        try {
          const { getTrackMetadata } = await import('@/lib/services/musicMetadata');
          const metadata = await getTrackMetadata(song, playlist.platform, spotifyToken);
          if (metadata) {
            allSongsMetadata.push({
              ...metadata,
              songId: song.id,
              playlistId: playlist.id,
            });
          } else {
            // Fallback: use basic song info if metadata fetch fails
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
        } catch (error) {
          console.error(`[smart-sort] Error fetching metadata for song ${song.id}:`, error);
          // Fallback: use basic song info
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

    console.log(`[smart-sort] Fetched metadata for ${allSongsMetadata.length} songs`);

    // Analyze and get optimal ordering using OpenAI
    console.log('[smart-sort] Analyzing with OpenAI...');
    const { playlistOrder, songOrders } = await analyzeAndSortPlaylists(
      groupId,
      playlists,
      allSongsMetadata
    );

    // Update database with new ordering
    console.log('[smart-sort] Updating database...');
          await updatePlaylistOrder(supabase, groupId, playlistOrder);
          await updateSongOrder(supabase, songOrders);

    console.log('[smart-sort] Smart sorting completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Playlists and songs sorted successfully',
      playlistOrder,
      songOrders,
      songsProcessed: allSongsMetadata.length,
    });

  } catch (error) {
    console.error('[smart-sort] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sort playlists', 
        message: error.message,
      },
      { status: 500 }
    );
  }
}

