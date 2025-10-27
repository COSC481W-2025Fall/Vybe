// app/api/friends/route.js
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

    // Get all accepted friends for the current user
    const { data: friendships, error: friendsError } = await supabase
      .from('friends')
      .select(`
        id,
        user1_id,
        user2_id,
        status,
        created_at
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    // Get unique friend IDs
    const friendIds = [...new Set(friendships.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id))];

    // Fetch user details for friends
    const friends = [];
    for (const friendId of friendIds) {
      try {
        const { data: friendData, error: userError } = await supabase.auth.admin.getUserById(friendId);
        if (!userError && friendData?.user) {
          const friendUser = friendData.user;
          const friendship = friendships.find(f => f.user1_id === friendId || f.user2_id === friendId);
          friends.push({
            id: friendUser.id,
            email: friendUser.email,
            name: friendUser.user_metadata?.full_name || friendUser.email?.split('@')[0],
            username: friendUser.user_metadata?.username || friendUser.email?.split('@')[0],
            friendship_id: friendship?.id,
            created_at: friendship?.created_at
          });
        }
      } catch (err) {
        console.error(`Error fetching user ${friendId}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      friends 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
    }

    if (friendId === user.id) {
      return NextResponse.json({ error: 'You cannot send a friend request to yourself' }, { status: 400 });
    }

    // Check if user exists
    const { data: friendUser, error: userError } = await supabase.auth.admin.getUserById(friendId);
    if (userError || !friendUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user1_id < user2_id for consistency
    const user1Id = user.id < friendId ? user.id : friendId;
    const user2Id = user.id < friendId ? friendId : user.id;

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friends')
      .select('id, status')
      .eq('user1_id', user1Id)
      .eq('user2_id', user2Id)
      .single();

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: 'You are already friends' }, { status: 400 });
      } else if (existingFriendship.status === 'pending') {
        return NextResponse.json({ error: 'Friend request already sent' }, { status: 400 });
      }
    }

    // Only the user with the smaller ID can send friend requests (to maintain order)
    if (user1Id !== user.id) {
      return NextResponse.json({ error: 'Friend request already exists from this user' }, { status: 400 });
    }

    // Create friend request
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        status: 'pending'
      })
      .select()
      .single();

    if (friendshipError) {
      console.error('Error creating friend request:', friendshipError);
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Friend request sent',
      friendship 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

