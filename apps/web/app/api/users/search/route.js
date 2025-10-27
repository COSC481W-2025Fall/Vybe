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
    const query = searchParams.get('q'); // Search query
    const limit = parseInt(searchParams.get('limit')) || 10;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    // TODO: Your task - Search for users
    // Hint: Query auth.users table
    // Hint: Search by email or display_name (use ILIKE for case-insensitive search)
    // Hint: Exclude the current user (WHERE id != user.id)
    // Hint: Exclude users who are already friends or have pending requests
    // Hint: Limit results and return user id, email, display_name, avatar_url

    // Placeholder response - replace this with your implementation
    return NextResponse.json({ 
      success: true, 
      users: [] // Search results will go here
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
