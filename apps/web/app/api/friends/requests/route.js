// app/api/friends/requests/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending friend requests (both sent and received)
    const { data: friendships, error: requestsError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch friend requests' }, { status: 500 });
    }

    // Categorize requests
    const sent = [];
    const received = [];

    // Get all unique friend IDs
    const friendIds = [...new Set(friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id))];

    // Fetch user details from the public users table
    for (const friendId of friendIds) {
      const { data: friendUser } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('id', friendId)
        .single();

      if (friendUser) {
        const friendship = friendships.find(f =>
          (f.user_id === user.id && f.friend_id === friendId) ||
          (f.user_id === friendId && f.friend_id === user.id)
        );

        if (friendship) {
          const friendInfo = {
            id: friendUser.id,
            email: '',
            name: friendUser.display_name || friendUser.username,
            username: friendUser.username,
            friendship_id: friendship.id,
            created_at: friendship.created_at
          };

          if (friendship.user_id === user.id) {
            sent.push(friendInfo);
          } else {
            received.push(friendInfo);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      received
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { friendshipId, action } = body;

    if (!friendshipId || !action) {
      return NextResponse.json({ error: 'Friendship ID and action are required' }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be accept or reject' }, { status: 400 });
    }

    // Check if friendship exists and user is the recipient
    const { data: friendship, error: checkError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .eq('id', friendshipId)
      .eq('status', 'pending')
      .single();

    if (checkError || !friendship) {
      return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 });
    }

    // Verify user is the recipient (friend_id)
    if (friendship.friend_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to perform this action' }, { status: 403 });
    }

    if (action === 'accept') {
      // Update status to accepted
      const { error: updateError } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (updateError) {
        console.error('Error accepting friend request:', updateError);
        return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted'
      });

    } else if (action === 'reject') {
      // Delete the friendship record
      const { error: deleteError } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (deleteError) {
        console.error('Error rejecting friend request:', deleteError);
        return NextResponse.json({ error: 'Failed to reject friend request' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request rejected'
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
