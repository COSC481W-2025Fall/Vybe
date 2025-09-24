import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/google-auth - Exchange Google OAuth code for tokens and create session
 * This endpoint handles the OAuth callback from Google and exchanges the authorization code
 * for access/refresh tokens, then stores them securely in the database
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Parse the request body to get the authorization code from Google
    const body = await request.json();
    const { code, state } = body;

    // Validate required fields
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Exchange the authorization code for a session using Supabase Auth
    // This will automatically handle the OAuth flow with Google
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Google OAuth exchange error:', error);
      return NextResponse.json({ 
        error: 'Failed to exchange authorization code', 
        details: error.message 
      }, { status: 400 });
    }

    // Check if we have a valid session and user
    if (!data.session || !data.user) {
      return NextResponse.json({ error: 'No session created' }, { status: 400 });
    }

    const userId = data.user.id;
    const session = data.session;

    // Extract Google OAuth tokens from the session
    // These are provided by Supabase when using Google as an OAuth provider
    const accessToken = session.provider_token;
    const refreshToken = session.provider_refresh_token;
    const expiresIn = session.provider_token_expires_in || 3600; // Default to 1 hour
    const scope = session.provider_scope;

    // Store Google tokens in our database for future API calls
    // This allows us to make authenticated requests to Google APIs
    if (accessToken) {
      const { error: tokenError } = await supabase
        .from('google_tokens')
        .upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken, // May be null for some OAuth flows
          expires_at: Math.floor(Date.now() / 1000) + expiresIn, // Convert to Unix timestamp
          scope: scope,
          token_type: 'Bearer',
        }, { 
          onConflict: 'user_id' // Update existing token if user already has one
        });

      if (tokenError) {
        console.error('Database error storing Google tokens:', tokenError);
        // Don't fail the login if token storage fails, just log it
        // The session is still valid even if we can't store tokens
      }
    }

    // Return success response with user information
    return NextResponse.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
        avatar_url: data.user.user_metadata?.avatar_url,
        provider: 'google'
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at
      }
    });

  } catch (error) {
    console.error('Google auth API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/google-auth - Get current user's Google token status
 * This endpoint checks if the current user has valid Google tokens stored
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

    // Check if user has Google tokens stored
    const { data: tokens, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error fetching Google tokens:', error);
      return NextResponse.json({ error: 'Failed to fetch token status' }, { status: 500 });
    }

    // Check if tokens exist and are not expired
    const hasValidTokens = tokens && tokens.expires_at > Math.floor(Date.now() / 1000);

    return NextResponse.json({
      hasGoogleTokens: !!tokens,
      hasValidTokens: hasValidTokens,
      expiresAt: tokens?.expires_at || null,
      scope: tokens?.scope || null
    });

  } catch (error) {
    console.error('Google auth status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
