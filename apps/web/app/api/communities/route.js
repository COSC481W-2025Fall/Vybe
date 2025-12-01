// app/api/communities/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/communities
 * Fetch all communities
 * 
 * Returns:
 * - 200: List of communities
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user (optional - communities are public)
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all communities
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });

    if (communitiesError) {
      console.error('Error fetching communities:', communitiesError);
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      communities: communities || []
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/communities
 * Create a new community
 * 
 * Request body:
 * {
 *   name: string (required)
 *   description?: string
 *   member_count?: number
 *   group_count?: number
 *   playlist_links?: array of {platform: 'spotify'|'youtube', url: string, label?: string}
 * }
 * 
 * Returns:
 * - 200: Created community
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Server error
 */
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
    const { name, description, member_count, group_count, playlist_links } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Community name is required' }, { status: 400 });
    }

    // Validate playlist_links format if provided
    if (playlist_links && Array.isArray(playlist_links)) {
      for (const link of playlist_links) {
        if (!link.platform || !['spotify', 'youtube'].includes(link.platform)) {
          return NextResponse.json({ 
            error: 'Invalid playlist link: platform must be "spotify" or "youtube"' 
          }, { status: 400 });
        }
        if (!link.url || typeof link.url !== 'string') {
          return NextResponse.json({ 
            error: 'Invalid playlist link: url is required' 
          }, { status: 400 });
        }
      }
    }

    // Create the community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        member_count: member_count || 0,
        group_count: group_count || 0,
        playlist_links: playlist_links || []
      })
      .select()
      .single();

    if (communityError) {
      console.error('Error creating community:', communityError);
      return NextResponse.json({ error: 'Failed to create community' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      community
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

