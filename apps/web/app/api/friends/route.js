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

    // TODO: Your task - Get all friends for the current user
    // Hint: Query the friends table where user1_id OR user2_id equals user.id
    // Hint: Only return 'accepted' friendships
    // Hint: Join with auth.users to get friend details (name, email, etc.)

    // Placeholder response - replace this with your implementation
    return NextResponse.json({ 
      success: true, 
      friends: [] // Your friends data will go here
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

    // TODO: Your task - Send a friend request
    // Hint: Validate that friendId exists and is not the current user
    // Hint: Check if friendship already exists (pending or accepted)
    // Hint: Insert new record with user1_id = user.id, user2_id = friendId, status = 'pending'

    // Placeholder response - replace this with your implementation
    return NextResponse.json({ 
      success: true, 
      message: 'Friend request sent' 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
