// app/api/communities/[id]/curate-song/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/communities/[id]/curate-song
 * Approve or remove a song from a community playlist
 * 
 * Request body:
 * {
 *   song_id: string (required)
 *   playlist_link_index: number (required)
 *   status: 'approved' | 'removed' (required)
 *   removal_reason?: string (optional, for removed songs)
 *   song_title: string (required)
 *   song_artist?: string
 *   song_thumbnail?: string
 *   song_duration?: number
 *   platform: 'spotify' | 'youtube' (required)
 * }
 * 
 * Returns:
 * - 200: Success
 * - 400: Validation error
 * - 401: Unauthorized
 * - 404: Community not found
 * - 500: Server error
 */
export async function POST(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      song_id, 
      playlist_link_index, 
      status, 
      removal_reason,
      song_title,
      song_artist,
      song_thumbnail,
      song_duration,
      platform
    } = body;

    // Validate required fields
    if (!song_id || playlist_link_index === undefined || !status || !song_title || !platform) {
      return NextResponse.json({ 
        error: 'Missing required fields: song_id, playlist_link_index, status, song_title, platform' 
      }, { status: 400 });
    }

    if (!['approved', 'removed'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be "approved" or "removed"' 
      }, { status: 400 });
    }

    if (!['spotify', 'youtube'].includes(platform)) {
      return NextResponse.json({ 
        error: 'Platform must be "spotify" or "youtube"' 
      }, { status: 400 });
    }

    // Verify community exists
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('playlist_links')
      .eq('id', id)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Verify playlist_link_index is valid
    const playlistLinks = community.playlist_links || [];
    if (playlist_link_index < 0 || playlist_link_index >= playlistLinks.length) {
      return NextResponse.json({ error: 'Invalid playlist_link_index' }, { status: 400 });
    }

    // Upsert curated song
    const { data: curatedSong, error: upsertError } = await supabase
      .from('curated_songs')
      .upsert({
        community_id: id,
        playlist_link_index: playlist_link_index,
        song_id: song_id,
        song_title: song_title,
        song_artist: song_artist || null,
        song_thumbnail: song_thumbnail || null,
        song_duration: song_duration || null,
        platform: platform,
        status: status,
        removal_reason: status === 'removed' ? (removal_reason || 'vulgar') : null,
        curated_by: user.id
      }, {
        onConflict: 'community_id,playlist_link_index,song_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting curated song:', upsertError);
      return NextResponse.json({ error: 'Failed to curate song' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      curated_song: curatedSong
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/communities/[id]/curate-song
 * Remove curation status for a song (reset to pending)
 * 
 * Request body:
 * {
 *   song_id: string (required)
 *   playlist_link_index: number (required)
 * }
 */
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { song_id, playlist_link_index } = body;

    if (!song_id || playlist_link_index === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: song_id, playlist_link_index' 
      }, { status: 400 });
    }

    // Delete curated song entry
    const { error: deleteError } = await supabase
      .from('curated_songs')
      .delete()
      .eq('community_id', id)
      .eq('playlist_link_index', playlist_link_index)
      .eq('song_id', song_id);

    if (deleteError) {
      console.error('Error deleting curated song:', deleteError);
      return NextResponse.json({ error: 'Failed to remove curation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Curation removed'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

