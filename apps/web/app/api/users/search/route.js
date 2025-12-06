// app/api/users/search/route.js
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // If no query, return all users (for browsing)
    if (!query || query.trim().length === 0) {
      // First get all users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .neq('id', user.id)
        .limit(50);

      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      if (!allUsers || allUsers.length === 0) {
        return NextResponse.json({
          success: true,
          users: []
        });
      }

      // Get privacy settings for these users to filter by searchable
      const userIds = allUsers.map(u => u.id);
      const { data: privacySettings } = await supabase
        .from('user_privacy_settings')
        .select('user_id, searchable')
        .in('user_id', userIds);

      // Create a map of user_id -> searchable (default to true if no settings exist)
      const searchableMap = new Map();
      privacySettings?.forEach(ps => {
        searchableMap.set(ps.user_id, ps.searchable ?? true);
      });

      // Filter to only searchable users (default to true if no privacy settings exist)
      const searchableUsers = allUsers.filter(u => {
        const searchable = searchableMap.get(u.id) ?? true; // Default to searchable if no settings
        return searchable === true;
      });

      // Get existing friendships
      const { data: existingFriends, error: friendsError } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      console.log('[users/search browse] Current user:', user.id);
      console.log('[users/search browse] Friendships query result:', { count: existingFriends?.length, friendsError });
      if (existingFriends?.length > 0) {
        console.log('[users/search browse] Sample friendships:', existingFriends.slice(0, 3));
      }

      const users = searchableUsers.map(u => {
        const friendship = existingFriends?.find(f =>
          (f.user_id === user.id && f.friend_id === u.id) ||
          (f.user_id === u.id && f.friend_id === user.id)
        );

        // Determine friendship direction for pending requests
        let friendshipDirection = null;
        if (friendship && friendship.status === 'pending') {
          friendshipDirection = friendship.user_id === user.id ? 'outgoing' : 'incoming';
        }

        return {
          id: u.id,
          email: '', // Email not included in query for privacy
          name: u.display_name || u.username || 'User',
          username: u.username || '',
          friendship_status: friendship?.status || null,
          friendship_direction: friendshipDirection,
          friendship_id: friendship?.id || null
        };
      });

      return NextResponse.json({
        success: true,
        users
      });
    }

    // Search the public users table
    const searchQuery = query.toLowerCase();

    console.log('Searching for:', searchQuery);

    const { data: matchingUsers, error: searchError } = await supabase
      .from('users')
      .select('id, username, display_name')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .neq('id', user.id)
      .limit(20);

    if (searchError) {
      console.error('Error searching users:', searchError);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    console.log('Found users:', matchingUsers);

    if (!matchingUsers || matchingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        users: []
      });
    }

    // Get privacy settings for these users to filter by searchable
    const userIds = matchingUsers.map(u => u.id);
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('user_id, searchable')
      .in('user_id', userIds);

    // Create a map of user_id -> searchable (default to true if no settings exist)
    const searchableMap = new Map();
    privacySettings?.forEach(ps => {
      searchableMap.set(ps.user_id, ps.searchable ?? true);
    });

    // Filter to only searchable users (default to searchable if no privacy settings exist)
    const searchableUsers = matchingUsers.filter(u => {
      const searchable = searchableMap.get(u.id) ?? true; // Default to searchable if no settings
      return searchable === true;
    });

    // Get existing friendships for these users to show status
    const { data: existingFriends, error: friendsError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    console.log('[users/search] Current user:', user.id);
    console.log('[users/search] Friendships query result:', { existingFriends, friendsError });

    const users = searchableUsers.map(u => {
      const friendship = existingFriends?.find(f =>
        (f.user_id === user.id && f.friend_id === u.id) ||
        (f.user_id === u.id && f.friend_id === user.id)
      );

      // Determine friendship direction for pending requests
      let friendshipDirection = null;
      if (friendship && friendship.status === 'pending') {
        friendshipDirection = friendship.user_id === user.id ? 'outgoing' : 'incoming';
      }

      return {
        id: u.id,
        email: '', // Email not included in query for privacy
        name: u.display_name || u.username || 'User',
        username: u.username || '',
        friendship_status: friendship?.status || null,
        friendship_direction: friendshipDirection,
        friendship_id: friendship?.id || null
      };
    });

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
