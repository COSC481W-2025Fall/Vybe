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

    // Use RPC function to fetch friend requests (bypasses RLS)
    console.log('Fetching friend requests for user:', user.id);
    
    const { data: requests, error: requestsError } = await supabase.rpc('get_friend_requests', {
      p_user_id: user.id
    });

    if (requestsError) {
      console.error('Error fetching friend requests via RPC:', {
        code: requestsError.code,
        message: requestsError.message,
        details: requestsError.details,
        hint: requestsError.hint
      });
      return NextResponse.json({ 
        error: 'Failed to fetch friend requests',
        details: requestsError.message
      }, { status: 500 });
    }

    console.log('Fetched friend requests from RPC:', { 
      total: requests?.length || 0,
      requests: requests
    });

    // Categorize requests based on request_type from RPC
    const sent = [];
    const received = [];

    if (requests && requests.length > 0) {
      for (const request of requests) {
        const friendInfo = {
          id: request.friendship_user_id === user.id ? request.friendship_friend_id : request.friendship_user_id,
          email: '',
          name: request.friend_display_name || request.friend_username,
          username: request.friend_username,
          friendship_id: request.friendship_id,
          created_at: request.friendship_created_at
        };

        if (request.request_type === 'sent') {
          console.log('Categorizing as SENT:', { friendshipId: request.friendship_id, friendUsername: request.friend_username });
          sent.push(friendInfo);
        } else if (request.request_type === 'received') {
          console.log('Categorizing as RECEIVED:', { friendshipId: request.friendship_id, friendUsername: request.friend_username });
          received.push(friendInfo);
        } else {
          console.warn('Unknown request type:', request);
        }
      }
    }

    console.log('Final categorized requests:', { sent: sent.length, received: received.length });

    return NextResponse.json({
      success: true,
      sent,
      received
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { friendshipId, action } = body;

    if (!friendshipId || !action) {
      return NextResponse.json({ error: 'Friendship ID and action are required' }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be accept or reject' }, { status: 400 });
    }

    // Use RPC to atomically validate and accept/reject (bypasses RLS safely)
    const { data: result, error: rpcError } = await supabase.rpc('update_friend_request', {
      p_user_id: user.id,
      p_friendship_id: friendshipId,
      p_action: action
    });

    if (rpcError) {
      const msg = rpcError.message || '';
      if (msg.includes('not found')) {
        return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 });
      }
      if (msg.includes('already processed')) {
        return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 });
      }
      if (msg.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized to perform this action' }, { status: 403 });
      }
      if (msg.includes('Invalid action')) {
        return NextResponse.json({ error: 'Action must be accept or reject' }, { status: 400 });
      }
      console.error('RPC update_friend_request error:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint
      });
      return NextResponse.json({ error: 'Failed to update friend request' }, { status: 500 });
    }

    // If we reach here, action succeeded
    return NextResponse.json({
      success: true,
      message: action === 'accept' ? 'Friend request accepted' : 'Friend request rejected',
      friendship: Array.isArray(result) ? result[0] : result
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
