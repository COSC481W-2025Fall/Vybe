// app/api/groups/[id]/reset-sort/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/groups/[id]/reset-sort
 * Resets the smart sort order for a group, reverting to original playlist order
 */
export async function POST(request, { params }) {
  console.log('[Reset Sort API] Starting reset...');
  
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get group ID from params
    const resolvedParams = await Promise.resolve(params);
    const groupId = resolvedParams.id;

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    console.log(`[Reset Sort API] Group: ${groupId}, User: ${user.id}`);

    // Verify user has access to this group (owner or member)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, owner_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is owner or member
    const isOwner = group.owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Clear the unified sort order from the group
    const { error: updateGroupError } = await supabase
      .from('groups')
      .update({
        all_songs_sort_order: null,
        all_songs_sorted_at: null,
      })
      .eq('id', groupId);

    if (updateGroupError) {
      console.error('[Reset Sort API] Failed to reset group sort:', updateGroupError);
      return NextResponse.json({ error: 'Failed to reset sort order' }, { status: 500 });
    }

    // Reset playlist smart_sorted_order to null
    const { error: playlistsError } = await supabase
      .from('group_playlists')
      .update({
        smart_sorted_order: null,
        last_sorted_at: null,
      })
      .eq('group_id', groupId);

    if (playlistsError) {
      console.error('[Reset Sort API] Failed to reset playlist order:', playlistsError);
      // Continue - partial success is still useful
    }

    // Reset song smart_sorted_order for all songs in this group's playlists
    // First get all playlist IDs
    const { data: playlists } = await supabase
      .from('group_playlists')
      .select('id')
      .eq('group_id', groupId);

    if (playlists && playlists.length > 0) {
      const playlistIds = playlists.map(p => p.id);
      
      const { error: songsError } = await supabase
        .from('playlist_songs')
        .update({ smart_sorted_order: null })
        .in('playlist_id', playlistIds);

      if (songsError) {
        console.error('[Reset Sort API] Failed to reset song order:', songsError);
        // Continue - partial success is still useful
      }
    }

    console.log('[Reset Sort API] ✅ Sort order reset successfully');

    return NextResponse.json({
      success: true,
      message: 'Sort order reset to default',
    });

  } catch (error) {
    console.error('[Reset Sort API] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to reset sort order' 
    }, { status: 500 });
  }
}

