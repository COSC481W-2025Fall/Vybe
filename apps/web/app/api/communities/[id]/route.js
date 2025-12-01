// app/api/communities/[id]/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/communities/[id]
 * Fetch a single community by ID
 * 
 * Returns:
 * - 200: Community data
 * - 404: Community not found
 * - 500: Server error
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { id } = await params;

    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

    if (communityError) {
      if (communityError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 });
      }
      console.error('Error fetching community:', communityError);
      return NextResponse.json({ error: 'Failed to fetch community' }, { status: 500 });
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

/**
 * PUT /api/communities/[id]
 * Update a community
 * 
 * Request body:
 * {
 *   name?: string
 *   description?: string
 *   member_count?: number
 *   group_count?: number
 *   playlist_links?: array of {platform: 'spotify'|'youtube', url: string, label?: string}
 * }
 * 
 * Returns:
 * - 200: Updated community
 * - 400: Validation error
 * - 401: Unauthorized
 * - 404: Community not found
 * - 500: Server error
 */
export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, member_count, group_count, playlist_links } = body;

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Community name cannot be empty' }, { status: 400 });
    }

    // Validate playlist_links format if provided
    if (playlist_links !== undefined) {
      if (!Array.isArray(playlist_links)) {
        return NextResponse.json({ 
          error: 'Invalid playlist_links: must be an array' 
        }, { status: 400 });
      }
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

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (member_count !== undefined) updateData.member_count = member_count;
    if (group_count !== undefined) updateData.group_count = group_count;
    if (playlist_links !== undefined) updateData.playlist_links = playlist_links;

    // Update the community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (communityError) {
      if (communityError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 });
      }
      console.error('Error updating community:', communityError);
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 });
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

/**
 * DELETE /api/communities/[id]
 * Delete a community
 * 
 * Returns:
 * - 200: Success
 * - 401: Unauthorized
 * - 404: Community not found
 * - 500: Server error
 */
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if community exists
    const { data: existing, error: checkError } = await supabase
      .from('communities')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Delete the community
    const { error: deleteError } = await supabase
      .from('communities')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting community:', deleteError);
      return NextResponse.json({ error: 'Failed to delete community' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Community deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

