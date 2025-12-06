/**
 * Sync Songs API
 * 
 * Syncs user's playlists and listening history to the global song database.
 * Called on sign-in and periodically to keep metadata fresh.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { batchRegisterSongs, getDatabaseStats } from '@/lib/services/globalSongDatabase';

/**
 * POST /api/sync-songs
 * 
 * Syncs user's playlists to the global song database.
 * Body: { source: 'signin' | 'manual' | 'group' }
 */
export async function POST(request) {
  const startTime = Date.now();
  console.log('\n========== [Sync Songs API] Starting ==========');

  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Empty body is fine
    }
    
    const source = body.source || 'manual';
    console.log(`[Sync Songs API] User: ${user.id}, Source: ${source}`);

    // Get user's imported playlists
    const { data: userPlaylists, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name, platform')
      .eq('user_id', user.id);

    if (playlistError) {
      console.error('[Sync Songs API] Playlist fetch error:', playlistError);
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }

    if (!userPlaylists || userPlaylists.length === 0) {
      console.log('[Sync Songs API] No playlists found for user');
      return NextResponse.json({ 
        success: true, 
        message: 'No playlists to sync',
        songsProcessed: 0 
      });
    }

    console.log(`[Sync Songs API] Found ${userPlaylists.length} playlists`);

    // Get all songs from user's playlists
    const playlistIds = userPlaylists.map(p => p.id);
    const { data: allSongs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('id, title, artist, spotify_id, youtube_id, channel_name, platform, genres, popularity, audio_features')
      .in('playlist_id', playlistIds);

    if (songsError) {
      console.error('[Sync Songs API] Songs fetch error:', songsError);
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
    }

    if (!allSongs || allSongs.length === 0) {
      console.log('[Sync Songs API] No songs found in playlists');
      return NextResponse.json({ 
        success: true, 
        message: 'No songs to sync',
        songsProcessed: 0 
      });
    }

    console.log(`[Sync Songs API] Found ${allSongs.length} songs to process`);

    // Prepare songs for registration
    const songsToRegister = allSongs.map(song => ({
      originalTitle: song.title,
      originalArtist: song.artist,
      spotifyId: song.spotify_id,
      youtubeId: song.youtube_id,
      channelName: song.channel_name,
      genres: song.genres || [],
      popularity: song.popularity || 0,
      audioFeatures: song.audio_features || {},
    }));

    // Batch register (this will skip songs that already exist)
    const results = await batchRegisterSongs(songsToRegister);
    
    const newSongs = results.filter(r => r && !r.alreadyExists).length;
    const existingSongs = results.filter(r => r && r.alreadyExists).length;
    
    console.log(`[Sync Songs API] Results: ${newSongs} new, ${existingSongs} already existed`);

    // Also sync songs from user's groups
    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    const { data: ownedGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('owner_id', user.id);

    const groupIds = [
      ...(memberGroups || []).map(g => g.group_id),
      ...(ownedGroups || []).map(g => g.id),
    ];

    let groupSongsProcessed = 0;
    if (groupIds.length > 0) {
      // Get group playlists
      const { data: groupPlaylists } = await supabase
        .from('group_playlists')
        .select('id')
        .in('group_id', groupIds);

      if (groupPlaylists && groupPlaylists.length > 0) {
        const groupPlaylistIds = groupPlaylists.map(p => p.id);
        const { data: groupSongs } = await supabase
          .from('playlist_songs')
          .select('id, title, artist, spotify_id, youtube_id, channel_name, platform, genres, popularity')
          .in('playlist_id', groupPlaylistIds);

        if (groupSongs && groupSongs.length > 0) {
          const groupSongsToRegister = groupSongs.map(song => ({
            originalTitle: song.title,
            originalArtist: song.artist,
            spotifyId: song.spotify_id,
            youtubeId: song.youtube_id,
            channelName: song.channel_name,
            genres: song.genres || [],
            popularity: song.popularity || 0,
          }));

          const groupResults = await batchRegisterSongs(groupSongsToRegister);
          groupSongsProcessed = groupResults.filter(r => r && !r.alreadyExists).length;
          console.log(`[Sync Songs API] Group songs: ${groupSongsProcessed} new`);
        }
      }
    }

    // Update user's last sync time
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        key: 'last_song_sync',
        value: new Date().toISOString(),
      }, { onConflict: 'user_id,key' });

    // Get final database stats
    const stats = await getDatabaseStats();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Sync Songs API] ✅ Complete in ${totalTime}s`);
    console.log('========== [Sync Songs API] Done ==========\n');

    return NextResponse.json({
      success: true,
      songsProcessed: allSongs.length,
      newSongsRegistered: newSongs + groupSongsProcessed,
      existingSongs,
      groupSongsProcessed,
      databaseStats: stats,
      processingTime: `${totalTime}s`,
    });

  } catch (error) {
    console.error('[Sync Songs API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync songs. Please try again.',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/sync-songs
 * 
 * Get sync status and database stats
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last sync time
    const { data: lastSync } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'last_song_sync')
      .single();

    // Get database stats
    const stats = await getDatabaseStats();

    return NextResponse.json({
      lastSync: lastSync?.value || null,
      databaseStats: stats,
    });

  } catch (error) {
    console.error('[Sync Songs API] GET Error:', error);
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 });
  }
}

