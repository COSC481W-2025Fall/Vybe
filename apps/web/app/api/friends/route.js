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
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    console.log('Friendships found:', friendships);

    // Get unique friend IDs
    const friendIds = [...new Set(friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id))];

    // Fetch user details from the public users table
    const friends = [];
    for (const friendId of friendIds) {
      const { data: friendUser } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('id', friendId)
        .single();

      if (friendUser) {
        const friendship = friendships.find(f => f.user_id === friendId || f.friend_id === friendId);
        friends.push({
          id: friendUser.id,
          email: '',
          name: friendUser.display_name || friendUser.username,
          username: friendUser.username,
          friendship_id: friendship?.id,
          created_at: friendship?.created_at
        });
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

    console.log('POST /api/friends - friendId:', friendId);

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
    }

    if (friendId === user.id) {
      return NextResponse.json({ error: 'You cannot send a friend request to yourself' }, { status: 400 });
    }

    // Check if user exists in the public users table (don't need admin for this)
    const { data: friendUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', friendId)
      .single();

    if (userError || !friendUser) {
      console.error('User not found in users table:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if friendship already exists (in either direction)
    const { data: existingFriendships } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    // Filter to check if there's a friendship with the specific friend
    const existingFriendship = existingFriendships?.find(f =>
      (f.user_id === user.id && f.friend_id === friendId) ||
      (f.user_id === friendId && f.friend_id === user.id)
    );

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: 'You are already friends' }, { status: 400 });
      } else if (existingFriendship.status === 'pending') {
        return NextResponse.json({ error: 'Friend request already sent or pending' }, { status: 400 });
      }
    }

    // Create friend request (user_id is sender, friend_id is receiver)
    console.log('Creating friend request:', { user_id: user.id, friend_id: friendId });

    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      })
      .select()
      .single();

    if (friendshipError) {
      console.error('Error creating friend request:', friendshipError);
      return NextResponse.json({ error: 'Failed to send friend request', details: friendshipError }, { status: 500 });
    }

    console.log('✅ Friend request created successfully in database:', {
      id: friendship.id,
      user_id: friendship.user_id,
      friend_id: friendship.friend_id,
      status: friendship.status
    });

    // Verify it was saved by querying it back
    const { data: verify } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendship.id)
      .single();

    console.log('🔍 Verified in database:', verify ? 'EXISTS' : 'NOT FOUND');

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
