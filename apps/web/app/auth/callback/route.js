// app/auth/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { CONFIG } from '@/config/constants';

// Helper function to exchange authorization code for Spotify tokens
async function exchangeSpotifyCode(code, redirectUri) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[exchangeSpotifyCode] ❌ Missing Spotify credentials');
    throw new Error('Spotify credentials not configured');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(CONFIG.SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[exchangeSpotifyCode] ❌ Exchange failed:', res.status, text);
    throw new Error(`Failed to exchange Spotify code: ${res.status} ${text}`);
  }

  const tokenData = await res.json();
  console.log('[exchangeSpotifyCode] ✅ Exchange successful');
  return tokenData; // { access_token, refresh_token, expires_in, scope, token_type }
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const intendedProvider = url.searchParams.get('provider'); // The provider button that was clicked
  
  // Security: Remove any sensitive parameters from URL (access_token, refresh_token, etc.)
  // These should never be in the URL - they come from the OAuth provider response or session
  const sensitiveParams = ['access_token', 'refresh_token', 'token', 'provider_token', 'provider_refresh_token'];
  for (const param of sensitiveParams) {
    if (url.searchParams.has(param)) {
      console.warn(`[callback] Security warning: ${param} found in URL, removing it`);
      url.searchParams.delete(param);
    }
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  if (code) {
    // IMPORTANT: For Spotify, we need to exchange the code BEFORE Supabase consumes it
    // because Supabase's exchangeCodeForSession will consume the code and we won't be able to use it again
    let accessToken = null;
    let refreshToken = null;
    let expiresIn = 3600;
    let scope = null;

    // If this is a Spotify login, exchange the code manually FIRST to get tokens
    // CRITICAL: The redirect URI must match EXACTLY what Supabase uses
    // Supabase uses: https://<project-ref>.supabase.co/auth/v1/callback
    // This is what Spotify sees, not our app's callback URL
    if (intendedProvider === 'spotify') {
      try {
        // Get Supabase URL from environment - this is the redirect URI Spotify actually sees
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const requestOrigin = new URL(request.url).origin;
        let redirectUri;
        
        if (supabaseUrl) {
          // Use Supabase's actual redirect URI (what Spotify expects)
          // Remove trailing slash if present to avoid double slashes
          const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, '');
          redirectUri = `${cleanSupabaseUrl}/auth/v1/callback`;
        } else {
          // Fallback: try our callback URL (may not work if not configured in Spotify app)
          redirectUri = `${requestOrigin}/auth/callback`;
          console.warn('[callback] ⚠️ Supabase URL not found, using fallback redirect URI');
        }
        
        const tokenData = await exchangeSpotifyCode(code, redirectUri);
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        expiresIn = tokenData.expires_in || 3600;
        scope = tokenData.scope || null;
      } catch (exchangeError) {
        console.error('[callback] ❌ Manual code exchange failed:', exchangeError.message);
        console.error('[callback] Continuing with Supabase exchange (tokens may be missing)');
      }
    }

    // Now exchange the code with Supabase to create the session
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[callback] ❌ Supabase exchange failed:', exchangeError.message);
      const errorUrl = new URL('/sign-in', request.url);
      errorUrl.searchParams.set('error', 'auth_failed');
      errorUrl.searchParams.set('message', exchangeError.message || 'Failed to authenticate');
      return NextResponse.redirect(errorUrl);
    }

    // Use session from exchangeCodeForSession response first, then fallback to getSession
    // This is important because cookies might not be set immediately after exchangeCodeForSession
    const session = sessionData?.session || (await supabase.auth.getSession()).data?.session;
    
    if (!session || !session.user) {
      console.error('[callback] ❌ No session after exchange');
      const errorUrl = new URL('/sign-in', request.url);
      errorUrl.searchParams.set('error', 'no_session');
      errorUrl.searchParams.set('message', 'Failed to create session. Please try again.');
      return NextResponse.redirect(errorUrl);
    }

    // If we didn't get tokens from manual exchange, try to get them from Supabase
    if (!accessToken || !refreshToken) {
      const supabaseAccessToken = sessionData?.session?.provider_token || session?.provider_token || null;
      const supabaseRefreshToken = sessionData?.session?.provider_refresh_token || session?.provider_refresh_token || null;
      const supabaseExpiresIn = sessionData?.session?.provider_token_expires_in || session?.provider_token_expires_in || 3600;
      const supabaseScope = sessionData?.session?.provider_scope || session?.provider_scope || null;
      
      if (supabaseAccessToken && supabaseRefreshToken) {
        accessToken = supabaseAccessToken;
        refreshToken = supabaseRefreshToken;
        expiresIn = supabaseExpiresIn;
        scope = supabaseScope;
      }
    }

    if (session?.user) {
      const userId = session.user.id;

      // Use the provider parameter from the URL (set by the login button that was clicked)
      // This is the most reliable way to know which provider the user intended to use
      const provider = intendedProvider || session.user?.app_metadata?.provider || null;

      // Extract profile picture from OAuth user metadata
      const avatarUrl = session.user?.user_metadata?.avatar_url ||
                        session.user?.user_metadata?.picture ||
                        null;

      // Update user profile picture and last_used_provider
      const updateData = {
        last_used_provider: provider,
        // Don't set updated_at manually - let the database trigger handle it
        // If the column doesn't exist, this will just be ignored
      };
      if (avatarUrl) {
        updateData.profile_picture_url = avatarUrl;
      }

      // Use UPDATE instead of UPSERT to avoid username requirement
      // The user should already exist from the auth trigger
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('[callback] Error updating user:', updateError.message);
      }

      // Store OAuth tokens in appropriate table based on provider
      if (provider === 'spotify' && accessToken && refreshToken) {
        const tokenPayload = {
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          scope,
          token_type: 'Bearer',
        };
        
        const { error: tokenError } = await supabase
          .from('spotify_tokens')
          .upsert(tokenPayload, { onConflict: 'user_id' });

        if (tokenError) {
          console.error('[callback] ❌ Failed to save Spotify tokens:', tokenError.code, tokenError.message);
        } else {
          console.log('[callback] ✅ Spotify tokens saved successfully');
        }
      } else if (provider === 'google' && accessToken && refreshToken) {
        const { error: tokenError } = await supabase.from('youtube_tokens').upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          scope,
          token_type: 'Bearer',
        }, { onConflict: 'user_id' });

        if (tokenError) {
          console.error('[callback] Error storing YouTube tokens:', tokenError.message);
        }
      }

      // Add provider to redirect URL so the library knows which service to use
      if (provider) {
        const nextUrl = new URL(next, request.url);
        nextUrl.searchParams.set('from', provider);

        // Security: Ensure no sensitive tokens are in the redirect URL
        for (const param of sensitiveParams) {
          nextUrl.searchParams.delete(param);
        }

        return NextResponse.redirect(nextUrl);
      }
    }
  }

  // Fallback redirect without provider parameter
  const fallbackUrl = new URL(next, request.url);
  for (const param of sensitiveParams) {
    fallbackUrl.searchParams.delete(param);
  }
  return NextResponse.redirect(fallbackUrl);
}
