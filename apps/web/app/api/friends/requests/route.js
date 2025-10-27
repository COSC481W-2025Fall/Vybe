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
      .from('friends')
      .select('id, user1_id, user2_id, status, created_at')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch friend requests' }, { status: 500 });
    }

    // Categorize requests
    const sent = [];
    const received = [];

    for (const friendship of friendships) {
      const friendId = friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id;
      
      try {
        const { data: friendData, error: userError } = await supabase.auth.admin.getUserById(friendId);
        if (!userError && friendData?.user) {
          const friendUser = friendData.user;
          const friendInfo = {
            id: friendUser.id,
            email: friendUser.email,
            name: friendUser.user_metadata?.full_name || friendUser.email?.split('@')[0],
            username: friendUser.user_metadata?.username || friendUser.email?.split('@')[0],
            friendship_id: friendship.id,
            created_at: friendship.created_at
          };

          if (friendship.user1_id === user.id) {
            sent.push(friendInfo);
          } else {
            received.push(friendInfo);
          }
        }
      } catch (err) {
        console.error(`Error fetching user ${friendId}:`, err);
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
      .from('friends')
      .select('id, user1_id, user2_id, status')
      .eq('id', friendshipId)
      .eq('status', 'pending')
      .single();

    if (checkError || !friendship) {
      return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 });
    }

    // Verify user is the recipient (user2_id)
    if (friendship.user2_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to perform this action' }, { status: 403 });
    }

    if (action === 'accept') {
      // Update status to accepted
      const { error: updateError } = await supabase
        .from('friends')
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
        .from('friends')
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

