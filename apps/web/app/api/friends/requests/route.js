// app/api/friends/requests/route.js
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

    // Get incoming friend requests (sent TO current user)
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friends')
      .select(`
        *,
        sender:auth.users!friends_user1_id_fkey(id, email, display_name, avatar_url)
      `)
      .eq('user2_id', user.id)
      .eq('status', 'pending');

    if (receivedError) {
      console.error('Error fetching received requests:', receivedError);
      return NextResponse.json({ error: 'Failed to fetch received requests' }, { status: 500 });
    }

    // Get outgoing friend requests (sent BY current user)
    const { data: sentRequests, error: sentError } = await supabase
      .from('friends')
      .select(`
        *,
        recipient:auth.users!friends_user2_id_fkey(id, email, display_name, avatar_url)
      `)
      .eq('user1_id', user.id)
      .eq('status', 'pending');

    if (sentError) {
      console.error('Error fetching sent requests:', sentError);
      return NextResponse.json({ error: 'Failed to fetch sent requests' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      received: receivedRequests || [], // Incoming requests
      sent: sentRequests || []          // Outgoing requests
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action } = body;
/////
    // Validate input
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Action must be accept or decline' }, { status: 400 });
    }

    // Get the friend request
    const { data: friendRequest, error: fetchError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Validate that the current user is the recipient
    if (friendRequest.user2_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to modify this request' }, { status: 403 });
    }

    // Validate that the request is pending
    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept the friend request
      const { data: updatedRequest, error: updateError } = await supabase
        .from('friends')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        console.error('Error accepting friend request:', updateError);
        return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
        request: updatedRequest
      });

    } else if (action === 'decline') {
      // Decline the friend request (delete it)
      const { error: deleteError } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        console.error('Error declining friend request:', deleteError);
        return NextResponse.json({ error: 'Failed to decline friend request' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request declined'
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
