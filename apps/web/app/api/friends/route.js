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

    console.log('[GET /api/friends] Fetching friends for user:', user.id);

    // Use RPC function to fetch accepted friends (bypasses RLS reliably)
    const { data: friendsData, error: rpcError } = await supabase.rpc('get_accepted_friends', {
      p_user_id: user.id
    });

    if (rpcError) {
      console.error('[GET /api/friends] RPC error:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint
      });
      
      // Fallback to direct query if RPC doesn't exist yet
      // PGRST202 = PostgREST "Could not find the function" error
      // 42883 = PostgreSQL "function does not exist" error
      const isRpcNotFound = 
        rpcError.code === 'PGRST202' || 
        rpcError.code === '42883' || 
        rpcError.message?.includes('Could not find the function') ||
        rpcError.message?.includes('does not exist');
      
      if (isRpcNotFound) {
        console.log('[GET /api/friends] RPC not found, falling back to direct query');
        return await getFriendsFallback(supabase, user.id);
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch friends',
        details: rpcError.message 
      }, { status: 500 });
    }

    console.log('[GET /api/friends] RPC returned:', friendsData?.length || 0, 'friends');

    // Map the RPC response to the expected format
    const friends = (friendsData || []).map(f => ({
      id: f.friend_user_id,
      email: '',
      name: f.friend_display_name || f.friend_username,
      username: f.friend_username,
      bio: f.friend_bio || null,
      profile_picture_url: f.friend_profile_picture_url || null,
      friendship_id: f.friendship_id,
      created_at: f.friendship_created_at
    }));

    return NextResponse.json({
      success: true,
      friends
    });

  } catch (error) {
    console.error('[GET /api/friends] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fallback function if RPC doesn't exist
async function getFriendsFallback(supabase, userId) {
  console.log('[GET /api/friends] Using fallback direct query');
  
  // Get all accepted friends for the current user
  // Use two separate queries to avoid RLS issues with .or()
  const { data: friendshipsAsUser, error: error1 } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  const { data: friendshipsAsFriend, error: error2 } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at')
    .eq('friend_id', userId)
    .eq('status', 'accepted');

  if (error1 || error2) {
    console.error('[GET /api/friends] Fallback query errors:', { error1, error2 });
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }

  const friendships = [...(friendshipsAsUser || []), ...(friendshipsAsFriend || [])];

  console.log('[GET /api/friends] Fallback found:', {
    total: friendships.length,
    asUser: friendshipsAsUser?.length || 0,
    asFriend: friendshipsAsFriend?.length || 0
  });

  // Get unique friend IDs
  const friendIds = [...new Set(friendships.map(f => f.user_id === userId ? f.friend_id : f.user_id))];

  // Fetch user details from the public users table
  const friends = [];
  for (const friendId of friendIds) {
    const { data: friendUser } = await supabase
      .from('users')
      .select('id, username, display_name, bio, profile_picture_url')
      .eq('id', friendId)
      .single();

    if (friendUser) {
      const friendship = friendships.find(f => f.user_id === friendId || f.friend_id === friendId);
      friends.push({
        id: friendUser.id,
        email: '',
        name: friendUser.display_name || friendUser.username,
        username: friendUser.username,
        bio: friendUser.bio || null,
        profile_picture_url: friendUser.profile_picture_url || null,
        friendship_id: friendship?.id,
        created_at: friendship?.created_at
      });
    }
  }

  return NextResponse.json({
    success: true,
    friends
  });
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

    // Check if user exists in the public users table
    // With RLS enabled, SELECT policy allows viewing all profiles
    const { data: friendUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', friendId)
      .single();

    if (userError) {
      console.error('Error checking if user exists:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      });
      
      // If it's a permission error, RLS might be blocking it
      if (userError.code === '42501' || userError.message?.includes('permission denied')) {
        console.error('RLS permission error when checking user existence');
        return NextResponse.json({ 
          error: 'Permission denied - unable to verify user exists',
          details: 'RLS policy may be blocking user lookup'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'User not found', 
        details: userError.message 
      }, { status: 404 });
    }

    if (!friendUser) {
      console.error('User not found in users table (no error but no data)');
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

    // Create friend request using RPC function (bypasses RLS)
    console.log('Creating friend request via RPC:', { user_id: user.id, friend_id: friendId });

    const { data: friendship, error: friendshipError } = await supabase.rpc('create_friend_request', {
      p_user_id: user.id,
      p_friend_id: friendId
    });

    if (friendshipError) {
      console.error('Error creating friend request via RPC:', {
        code: friendshipError.code,
        message: friendshipError.message,
        details: friendshipError.details,
        hint: friendshipError.hint
      });
      
      // Handle specific error cases
      if (friendshipError.message?.includes('already exists')) {
        return NextResponse.json({ 
          error: 'Friend request already sent or pending' 
        }, { status: 400 });
      }
      
      if (friendshipError.message?.includes('yourself')) {
        return NextResponse.json({ 
          error: 'You cannot send a friend request to yourself' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to send friend request', 
        details: friendshipError.message,
        code: friendshipError.code
      }, { status: 500 });
    }
    
    // RPC returns an array, get the first element
    const friendshipData = Array.isArray(friendship) ? friendship[0] : friendship;

    // Map the renamed columns back to expected names
    const mappedFriendship = friendshipData ? {
      id: friendshipData.friendship_id,
      user_id: friendshipData.friendship_user_id,
      friend_id: friendshipData.friendship_friend_id,
      status: friendshipData.friendship_status,
      created_at: friendshipData.friendship_created_at,
      updated_at: friendshipData.friendship_updated_at
    } : null;

    console.log('Friend request created successfully via RPC:', {
      id: mappedFriendship?.id,
      user_id: mappedFriendship?.user_id,
      friend_id: mappedFriendship?.friend_id,
      status: mappedFriendship?.status
    });

    return NextResponse.json({
      success: true,
      message: 'Friend request sent',
      friendship: mappedFriendship
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
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

    // Delete the friendship (check both directions)
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (deleteError) {
      console.error('Error removing friend:', deleteError);
      return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
