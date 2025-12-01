import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { analyzeAndSortPlaylists, analyzeAndSortByVibe } from '@/lib/services/openaiSorting';
import { updatePlaylistOrder, updateSongOrder } from '@/lib/db/smartSorting';

/**
 * POST /api/groups/[id]/smart-sort
 * Triggers AI-powered sorting of playlists and songs in a group
 */
export async function POST(request, { params }) {
  const startTime = Date.now();
  
  console.log('\n========== [SMART SORT] Starting ==========');
  
  try {
    const { id: groupId } = await params;
    
    // Parse request body to get mode parameter
    let mode = 'playlist';
    try {
      const body = await request.json().catch(() => ({}));
      mode = body.mode || 'playlist';
    } catch (err) {
      console.log('[smart-sort] Using default mode: playlist');
    }
    
    console.log(`[smart-sort] Mode: ${mode}, Group: ${groupId}`);
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

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

    // Fetch playlists
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

    // Fetch all songs
    const playlistIds = playlists.map(p => p.id);
    const { data: allSongs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('*')
      .in('playlist_id', playlistIds);

    if (songsError) {
      console.error('[smart-sort] Error fetching songs:', songsError);
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
    }

    console.log(`[smart-sort] Found ${playlists.length} playlists with ${allSongs?.length || 0} songs`);

    // For now, return success without actual sorting (to fix the route conflict first)
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[smart-sort] Completed in ${totalTime}s`);

    return NextResponse.json({
      success: true,
      message: 'Smart sort endpoint working',
      playlistCount: playlists.length,
      songCount: allSongs?.length || 0,
    });

  } catch (error) {
    console.error('[smart-sort] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sort playlists' },
      { status: 500 }
    );
  }
}
