// app/auth/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

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
    // Let Supabase handle the code exchange (it uses PKCE which we can't replicate)
    // We'll get tokens from Supabase's session response
    let accessToken = null;
    let refreshToken = null;
    let expiresIn = 3600;
    let scope = null;

    // Now exchange the code with Supabase to create the session
    // Pass the code explicitly - required for PKCE flow in newer Supabase versions
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[callback] Error exchanging code for session:', exchangeError);
      console.error('[callback] Error details:', JSON.stringify(exchangeError, null, 2));
      const errorUrl = new URL('/sign-in', request.url);
      errorUrl.searchParams.set('error', 'auth_failed');
      errorUrl.searchParams.set('message', exchangeError.message || 'Failed to authenticate');
      return NextResponse.redirect(errorUrl);
    }

    // Use session from exchangeCodeForSession response first, then fallback to getSession
    // This is important because cookies might not be set immediately after exchangeCodeForSession
    const session = sessionData?.session || (await supabase.auth.getSession()).data?.session;
    
    if (!session || !session.user) {
      console.error('[callback] No session found after exchangeCodeForSession');
      console.error('[callback] sessionData:', sessionData);
      const errorUrl = new URL('/sign-in', request.url);
      errorUrl.searchParams.set('error', 'no_session');
      errorUrl.searchParams.set('message', 'Failed to create session. Please try again.');
      return NextResponse.redirect(errorUrl);
    }

    console.log('[callback] session user:', session?.user?.id);
    console.log('[callback] provider:', session?.user?.app_metadata?.provider);
    console.log('[callback] exchangeCodeForSession has session:', !!sessionData?.session);
    console.log('[callback] exchangeCodeForSession provider_token:', !!sessionData?.session?.provider_token);

    // Get tokens from Supabase session (Supabase handles the OAuth exchange with PKCE)
    const supabaseAccessToken = sessionData?.session?.provider_token || session?.provider_token || null;
    const supabaseRefreshToken = sessionData?.session?.provider_refresh_token || session?.provider_refresh_token || null;
    const supabaseExpiresIn = sessionData?.session?.provider_token_expires_in || session?.provider_token_expires_in || 3600;
    const supabaseScope = sessionData?.session?.provider_scope || session?.provider_scope || null;
    
    if (supabaseAccessToken && supabaseRefreshToken) {
      accessToken = supabaseAccessToken;
      refreshToken = supabaseRefreshToken;
      expiresIn = supabaseExpiresIn;
      scope = supabaseScope;
    } else {
      console.warn('[callback] ⚠️ No provider tokens found in Supabase session');
    }

    console.log('[callback] has provider_token:', !!accessToken);
    console.log('[callback] has provider_refresh_token:', !!refreshToken);

    if (session?.user) {
      const userId = session.user.id;

      // Use the provider parameter from the URL (set by the login button that was clicked)
      // This is the most reliable way to know which provider the user intended to use
      const provider = intendedProvider || session.user?.app_metadata?.provider || null;

      console.log('[callback] Intended provider from button click:', intendedProvider);
      console.log('[callback] Using provider:', provider);

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
      } else {
        console.log('[callback] Successfully updated last_used_provider to:', provider);
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
        console.log('[callback] Storing Google tokens:', {
          userId,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          expiresIn,
          scope
        });

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
        } else {
          console.log('[callback] Successfully stored YouTube tokens');
        }
      }

      // Add provider to redirect URL so the library knows which service to use
      if (provider) {
        const nextUrl = new URL(next, request.url);

        // Always add the 'from' parameter to track which provider they logged in with
        nextUrl.searchParams.set('from', provider);

        // Security: Ensure no sensitive tokens are in the redirect URL
        for (const param of sensitiveParams) {
          nextUrl.searchParams.delete(param);
        }

        console.log('[callback] Redirecting to:', nextUrl.toString());
        return NextResponse.redirect(nextUrl);
      }
    }
  }

  // Fallback redirect without provider parameter
  console.log('[callback] No provider found, redirecting to:', next);
  const fallbackUrl = new URL(next, request.url);
  for (const param of sensitiveParams) {
    fallbackUrl.searchParams.delete(param);
  }
  return NextResponse.redirect(fallbackUrl);
}
