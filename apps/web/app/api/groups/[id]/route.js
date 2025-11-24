// app/api/groups/[id]/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve params if it's a Promise
    const resolvedParams = await Promise.resolve(params);
    const groupId = resolvedParams.id;

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Verify the group exists and user is the owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the group owner can delete the group' }, { status: 403 });
    }

    // Delete all group members first (cascade should handle this, but being explicit)
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId);

    if (membersError) {
      console.error('Error deleting group members:', membersError);
      // Continues with group deletion even if member deletion fails
    }

    // Delete all group playlists and their songs (cascade should handle this)
    const { error: playlistsError } = await supabase
      .from('group_playlists')
      .delete()
      .eq('group_id', groupId);

    if (playlistsError) {
      console.error('Error deleting group playlists:', playlistsError);
      // Continue with group deletion
    }

    // Delete the group
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


