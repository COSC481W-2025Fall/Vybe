import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/groups/join - Join a group using a join code
 * This endpoint allows users to join existing groups by providing the 6-character join code
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
    const { joinCode } = body;

    // Validate required fields
    if (!joinCode || joinCode.trim().length === 0) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    // Find the group by join code (case-insensitive search)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('join_code', joinCode.trim().toUpperCase())  // Normalize to uppercase
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
    }

    // Check if user is already a member of this group
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    // Handle database errors (PGRST116 means no rows found, which is expected)
    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('Database error checking membership:', memberCheckError);
      return NextResponse.json({ error: 'Failed to check membership' }, { status: 500 });
    }

    // Prevent duplicate memberships
    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 });
    }

    // Add user to the group as a regular member
    const { data: newMember, error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member'  // New members get 'member' role, not 'admin'
      })
      .select()
      .single();

    if (joinError) {
      console.error('Database error joining group:', joinError);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    // Return success response with group and membership information
    return NextResponse.json({ 
      success: true, 
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        join_code: group.join_code,
        created_at: group.created_at
      },
      member: {
        id: newMember.id,
        role: newMember.role,
        joined_at: newMember.joined_at
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
