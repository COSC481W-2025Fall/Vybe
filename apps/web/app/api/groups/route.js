// app/api/groups/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Generate a unique group code
function generateGroupCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
    const { name, description } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Generate unique group code
    let groupCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      groupCode = generateGroupCode();
      
      // Check if code already exists
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('code', groupCode)
        .single();
      
      if (!existingGroup) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique group code' }, { status: 500 });
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        code: groupCode,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Add the creator as a member of the group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      success: true, 
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        code: group.code,
        created_at: group.created_at,
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get groups where user is a member
    const { data: groups, error: groupsError } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        joined_at,
        groups (
          id,
          name,
          description,
          code,
          created_at,
          created_by
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      groups: groups.map(member => ({
        ...member.groups,
        role: member.role,
        joined_at: member.joined_at,
      }))
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
