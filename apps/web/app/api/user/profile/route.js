import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { profileSchema } from '@/lib/schemas/profileSchema';
import {
  validateRequest,
  formatValidationErrors,
  createErrorResponse,
  logValidationFailure,
  checkRateLimit,
} from '@/lib/validation/serverValidation';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * GET /api/user/profile
 * Fetch current user's profile information
 */
export async function GET() {
  try {
    const supabase = await makeSupabase();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[profile API] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get authentication provider
    const authProvider = user.app_metadata?.provider || 'email';
    
    // Get provider account info from user metadata
    const providerAccountName = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const providerAccountEmail = user.user_metadata?.email || user.email;
    const providerUserId = user.user_metadata?.preferred_username || user.user_metadata?.user_name || null;

    // Check Spotify connection and get account info if available
    const { data: spotifyToken } = await supabase
      .from('spotify_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    let spotifyAccountInfo = null;
    if (spotifyToken) {
      // Try to fetch Spotify account info if token is valid
      try {
        const { getValidAccessToken } = await import('../../../lib/spotify.js');
        const accessToken = await getValidAccessToken(supabase, user.id);
        const spotifyRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (spotifyRes.ok) {
          const spotifyData = await spotifyRes.json();
          spotifyAccountInfo = {
            display_name: spotifyData.display_name || null,
            id: spotifyData.id || null,
          };
        }
      } catch (e) {
        // Token may be invalid or expired - that's okay, we'll just show connected
        console.log('[profile API] Could not fetch Spotify account:', e.message);
      }
    }

    // Check YouTube connection  
    const { data: youtubeToken } = await supabase
      .from('youtube_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    let youtubeAccountInfo = null;
    if (youtubeToken) {
      // Try to fetch YouTube account info if token is available
      // Note: YouTube API access would require similar token handling
      // For now, we'll show connection status without account details
      youtubeAccountInfo = {
        connected: true,
      };
    }

    // Format provider name for display
    const formatProviderName = (provider) => {
      const names = {
        'spotify': 'Spotify',
        'google': 'Google (YouTube)',
        'email': 'Email',
      };
      return names[provider] || provider;
    };

    // Return profile data with connection status
    return NextResponse.json({
      id: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at ? true : false,
      display_name: profile?.display_name || null,
      bio: profile?.bio || null,
      profile_picture_url: profile?.profile_picture_url || user.user_metadata?.avatar_url || null,
      username: profile?.username || null,
      created_at: user.created_at,
      // Authentication provider info
      auth_provider: authProvider,
      auth_provider_display: formatProviderName(authProvider),
      provider_account_name: providerAccountName,
      provider_account_email: providerAccountEmail,
      provider_user_id: providerUserId,
      // Connection status
      spotify_connected: !!spotifyToken,
      spotify_account: spotifyAccountInfo,
      youtube_connected: !!youtubeToken,
      youtube_account: youtubeAccountInfo,
    });
  } catch (error) {
    console.error('[profile API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user profile
 * 
 * Request body:
 * {
 *   display_name: string (required, 2-50 chars, alphanumeric + spaces)
 *   bio?: string (optional, max 200 chars)
 *   profile_picture_url?: string (optional, valid URL)
 * }
 * 
 * Returns:
 * - 200: Updated profile data
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function PUT(request) {
  try {
    const supabase = await makeSupabase();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitKey = user.id || 'anonymous';
    const rateLimit = checkRateLimit(rateLimitKey, {
      limit: 10, // 10 updates per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const resetSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        createErrorResponse(
          'Rate limit exceeded',
          429,
          {
            message: `Too many requests. Please try again in ${resetSeconds} seconds.`,
            retryAfter: resetSeconds,
          }
        ),
        {
          status: 429,
          headers: {
            'Retry-After': String(resetSeconds),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          },
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse('Invalid JSON in request body', 400),
        { status: 400 }
      );
    }

    // Validate and sanitize input
    const validationResult = validateRequest(body, profileSchema, {
      endpoint: '/api/user/profile',
      userId: user.id,
      sanitize: true,
      logErrors: true,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        validationResult.errors,
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    
    if (validatedData.display_name !== undefined) {
      updateData.display_name = validatedData.display_name;
    }
    
    if (validatedData.bio !== undefined) {
      // Convert undefined to null for database (or empty string if preferred)
      updateData.bio = validatedData.bio || null;
    }
    
    if (validatedData.profile_picture_url !== undefined) {
      // Convert null to null (or empty string if preferred)
      updateData.profile_picture_url = validatedData.profile_picture_url || null;
    }

    // Update user profile in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[profile API] Error updating profile:', updateError);
      
      // Handle specific database errors
      if (updateError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A profile with this information already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Fetch updated profile with all fields (including those not updated)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[profile API] Error fetching updated profile:', profileError);
      // Even if fetch fails, return what we updated
      return NextResponse.json({
        id: user.id,
        email: user.email,
        display_name: updatedProfile?.display_name || null,
        bio: updatedProfile?.bio || null,
        profile_picture_url: updatedProfile?.profile_picture_url || null,
        message: 'Profile updated successfully',
      });
    }

    // Get authentication provider info for response
    const authProvider = user.app_metadata?.provider || 'email';
    const formatProviderName = (provider) => {
      const names = {
        'spotify': 'Spotify',
        'google': 'Google (YouTube)',
        'email': 'Email',
      };
      return names[provider] || provider;
    };

    // Return updated profile data (matching GET endpoint format)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at ? true : false,
      display_name: profile?.display_name || null,
      bio: profile?.bio || null,
      profile_picture_url: profile?.profile_picture_url || user.user_metadata?.avatar_url || null,
      username: profile?.username || null,
      created_at: user.created_at,
      auth_provider: authProvider,
      auth_provider_display: formatProviderName(authProvider),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('[profile API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

