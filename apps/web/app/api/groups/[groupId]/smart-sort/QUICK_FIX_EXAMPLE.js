// EXAMPLE: Quick Fix Implementation
// This shows how to modify the route to return immediately

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/groups/[groupId]/smart-sort
 * QUICK FIX: Returns immediately, processes in background
 */
export async function POST(request, { params }) {
  try {
    const { groupId } = await params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate user (quick check)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a member (quick check)
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    const isOwner = group.owner_id === session.user.id;
    const isMember = isOwner || membership !== null;

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // RETURN IMMEDIATELY - Don't wait for processing
    // Use setImmediate or setTimeout(0) to run in next event loop tick
    setImmediate(async () => {
      try {
        // Import the actual processing function
        const { processSmartSort } = await import('./processSmartSort');
        
        // Run the full processing in background
        await processSmartSort(groupId, session.user.id, supabase);
        
        console.log('[smart-sort] Background processing completed');
      } catch (error) {
        console.error('[smart-sort] Background processing error:', error);
        // Could store error in database or send notification here
      }
    });

    // Return immediately with success
    return NextResponse.json({
      success: true,
      message: 'Smart sort started. Processing in background...',
      status: 'processing'
    });

  } catch (error) {
    console.error('[smart-sort] Error starting job:', error);
    return NextResponse.json(
      { error: 'Failed to start smart sort', message: error.message },
      { status: 500 }
    );
  }
}

