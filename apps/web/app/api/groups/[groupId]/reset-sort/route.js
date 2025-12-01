import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/groups/[groupId]/reset-sort
 * Clears the "All" view sort order
 */
export async function POST(request, { params }) {
  try {
    const { groupId } = await params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check membership
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

    // Clear sort order
    const { error: updateError } = await supabase
      .from('groups')
      .update({
        all_songs_sort_order: null,
        all_songs_sorted_at: null
      })
      .eq('id', groupId);

    if (updateError) {
      console.error('[reset-sort] Error updating groups table:', updateError);
      return NextResponse.json({ error: 'Failed to reset sort order' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sort order reset' 
    });

  } catch (error) {
    console.error('[reset-sort] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset sort order' },
      { status: 500 }
    );
  }
}

