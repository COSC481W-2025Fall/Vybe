// app/api/groups/[id]/members/route.js
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

    // Get the member ID from request body
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Verify the group exists and user is the owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, owner_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the group owner can remove members' }, { status: 403 });
    }

    // Prevent removing the owner
    if (memberId === group.owner_id) {
      return NextResponse.json({ error: 'Cannot remove the group owner' }, { status: 400 });
    }

    // Verify the member exists in the group
    const { data: member, error: memberCheckError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', memberId)
      .single();

    if (memberCheckError || !member) {
      return NextResponse.json({ error: 'Member not found in this group' }, { status: 404 });
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


