import { getYouTubeChannelInfo, getYouTubePlaylists } from '@/lib/google';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/google-test - Test Google OAuth integration
 * This endpoint tests the Google OAuth integration by fetching user's YouTube data
 * It demonstrates that the OAuth flow is working correctly
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

    console.log('Testing Google OAuth for user:', user.id);

    // Test 1: Get user's YouTube channel information
    const channelInfo = await getYouTubeChannelInfo(user.id);
    
    if (channelInfo.error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to access YouTube API',
        details: channelInfo.error,
        status: channelInfo.status,
        message: 'Make sure you have signed in with Google and granted YouTube access permissions'
      }, { status: channelInfo.status });
    }

    // Test 2: Get user's YouTube playlists
    const playlists = await getYouTubePlaylists(user.id, 5); // Get first 5 playlists
    
    if (playlists.error) {
      console.warn('Could not fetch playlists:', playlists.error);
    }

    // Return successful test results
    return NextResponse.json({
      success: true,
      message: 'Google OAuth integration is working correctly!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
          provider: user.app_metadata?.provider
        },
        youtube: {
          channel: channelInfo.data,
          playlists: playlists.data || [],
          playlistsCount: playlists.data?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Google test API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
