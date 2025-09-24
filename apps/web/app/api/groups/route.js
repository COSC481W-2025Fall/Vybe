import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/groups - Fetch all groups that the current user belongs to
 * This endpoint returns groups with membership information for the authenticated user
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Authenticate the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query groups that the user belongs to using a join with group_members table
    // The !inner ensures we only get groups where the user is a member
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id, role, joined_at)
      `)
      .eq('group_members.user_id', user.id)  // Filter by current user's ID
      .order('created_at', { ascending: false }); // Most recent groups first

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    return NextResponse.json({ groups });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/groups - Create a new group
 * This endpoint creates a new group with a unique join code and adds the creator as an admin
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Authenticate the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Create the group with a unique join code
    // We generate the join code in JavaScript to avoid database function complexity
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        join_code: await generateUniqueJoinCode(supabase)  // Generate unique 6-char code
      })
      .select()
      .single();

    if (groupError) {
      console.error('Database error creating group:', groupError);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Add the creator as an admin member of the group
    // This is a separate transaction to ensure the creator is always a member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin'  // Creator gets admin role
      });

    if (memberError) {
      console.error('Database error adding creator to group:', memberError);
      // Clean up the group if member creation fails (rollback)
      await supabase.from('groups').delete().eq('id', group.id);
      return NextResponse.json({ error: 'Failed to add creator to group' }, { status: 500 });
    }

    // Return success response with group data (excluding sensitive fields)
    return NextResponse.json({ 
      success: true, 
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        join_code: group.join_code,
        created_at: group.created_at
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to generate unique join codes
 * Generates a 6-character alphanumeric code and ensures it's unique in the database
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<string>} - Unique join code
 */
async function generateUniqueJoinCode(supabase) {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate a 6-character alphanumeric code using base36 conversion
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Check if this code already exists in the database
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('join_code', code)
      .single();
    
    // PGRST116 error means no rows found, which means code is unique
    if (error && error.code === 'PGRST116') {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp-based code if we can't generate a unique random one
  // This ensures we always return a code, even in edge cases
  return Date.now().toString(36).toUpperCase().substring(-6);
}
