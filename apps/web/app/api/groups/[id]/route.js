// app/api/groups/[id]/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper to check if string is a UUID
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Lookup group by slug first (preferred), then by UUID as fallback
async function findGroup(supabase, identifier, selectFields = 'id, name, owner_id') {
  // Try slug first (handles edge case where slug looks like UUID)
  const { data: bySlug } = await supabase
    .from('groups')
    .select(selectFields)
    .eq('slug', identifier)
    .maybeSingle();
  
  if (bySlug) return { data: bySlug, error: null };
  
  // If not found by slug and looks like UUID, try by ID
  if (isUUID(identifier)) {
    return await supabase
      .from('groups')
      .select(selectFields)
      .eq('id', identifier)
      .single();
  }
  
  return { data: null, error: { message: 'Group not found' } };
}

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
    const groupIdOrSlug = resolvedParams.id;

    if (!groupIdOrSlug) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Lookup group by slug first, then UUID as fallback
    const { data: group, error: groupError } = await findGroup(supabase, groupIdOrSlug);

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the group owner can delete the group' }, { status: 403 });
    }

    // Use actual group ID for deletion operations
    const actualGroupId = group.id;

    // Delete all group members first (cascade should handle this, but being explicit)
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', actualGroupId);

    if (membersError) {
      console.error('Error deleting group members:', membersError);
      // Continues with group deletion even if member deletion fails
    }

    // Delete all group playlists and their songs (cascade should handle this)
    const { error: playlistsError } = await supabase
      .from('group_playlists')
      .delete()
      .eq('group_id', actualGroupId);

    if (playlistsError) {
      console.error('Error deleting group playlists:', playlistsError);
      // Continue with group deletion
    }

    // Delete the group
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', actualGroupId);

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


