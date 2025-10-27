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

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Search for users by email or username
    // Note: This is a simplified search. For production, you'd want more sophisticated search
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // Filter users based on query
    const searchQuery = query.toLowerCase();
    const matchingUsers = allUsers.users
      .filter(u => {
        if (u.id === user.id) return false; // Don't show current user
        
        const email = (u.email || '').toLowerCase();
        const username = (u.user_metadata?.username || '').toLowerCase();
        const fullName = (u.user_metadata?.full_name || '').toLowerCase();
        
        return email.includes(searchQuery) || 
               username.includes(searchQuery) || 
               fullName.includes(searchQuery);
      })
      .slice(0, 20); // Limit to 20 results

    // Get existing friendships for these users to show status
    const userIds = matchingUsers.map(u => u.id);
    const { data: existingFriends } = await supabase
      .from('friends')
      .select('user1_id, user2_id, status')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const users = matchingUsers.map(u => {
      const friendship = existingFriends?.find(f => 
        (f.user1_id === user.id && f.user2_id === u.id) || 
        (f.user1_id === u.id && f.user2_id === user.id)
      );

      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email?.split('@')[0],
        username: u.user_metadata?.username || u.email?.split('@')[0],
        friendship_status: friendship?.status || null
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

