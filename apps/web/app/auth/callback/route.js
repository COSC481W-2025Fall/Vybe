// app/auth/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const intendedProvider = url.searchParams.get('provider');
  const origin = request.nextUrl.origin;
  
  // Security: Remove any sensitive parameters from URL
  const sensitiveParams = ['access_token', 'refresh_token', 'token', 'provider_token', 'provider_refresh_token'];
  
  const cookieStore = await cookies();
  
  // Track all cookies that Supabase wants to set
  const responseCookies = [];
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          cookies.forEach(cookie => {
            responseCookies.push(cookie);
          });
        },
      },
    }
  );
  
  // Helper to create redirect with all Supabase cookies
  const redirectWithCookies = (redirectUrl) => {
    const response = NextResponse.redirect(redirectUrl);
    
    console.log('[callback] Setting', responseCookies.length, 'auth cookies');
    
    responseCookies.forEach(({ name, value, options }) => {
      // Ensure proper cookie options for production
      response.cookies.set(name, value, {
        ...options,
        path: '/',
        httpOnly: options?.httpOnly ?? true,
        secure: origin.startsWith('https://'),
        sameSite: options?.sameSite ?? 'lax',
      });
    });
    
    return response;
  };

  if (code) {
    console.log('[callback] Exchanging code for session...');
    
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('[callback] Cookies collected after exchange:', responseCookies.length);

    if (exchangeError) {
      console.error('[callback] Exchange error:', exchangeError.message);
      const errorUrl = new URL('/sign-in', origin);
      errorUrl.searchParams.set('error', 'auth_failed');
      errorUrl.searchParams.set('message', exchangeError.message || 'Failed to authenticate');
      return redirectWithCookies(errorUrl);
    }

    const session = sessionData?.session;
    
    if (!session || !session.user) {
      console.error('[callback] No session after exchange');
      const errorUrl = new URL('/sign-in', origin);
      errorUrl.searchParams.set('error', 'no_session');
      return redirectWithCookies(errorUrl);
    }

    console.log('[callback] Session created for user:', session.user.id);

    // Get provider tokens
    const accessToken = session.provider_token || null;
    const refreshToken = session.provider_refresh_token || null;
    const expiresIn = session.provider_token_expires_in || 3600;
    const scope = session.provider_scope || null;

    const userId = session.user.id;
    const provider = intendedProvider || session.user?.app_metadata?.provider || null;

    // Extract profile picture
    const avatarUrl = session.user?.user_metadata?.avatar_url ||
                      session.user?.user_metadata?.picture || null;

    // Update user
    const updateData = { last_used_provider: provider };
    if (avatarUrl) updateData.profile_picture_url = avatarUrl;

    await supabase.from('users').update(updateData).eq('id', userId);

    // Store OAuth tokens
    if (provider === 'spotify' && accessToken && refreshToken) {
      await supabase.from('spotify_tokens').upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        scope,
        token_type: 'Bearer',
      }, { onConflict: 'user_id' });
      console.log('[callback] Spotify tokens saved');
    } else if (provider === 'google' && accessToken && refreshToken) {
      await supabase.from('youtube_tokens').upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        scope,
        token_type: 'Bearer',
      }, { onConflict: 'user_id' });
      console.log('[callback] YouTube tokens saved');
    }

    // Build redirect URL
    const nextUrl = new URL(next, origin);
    if (provider) nextUrl.searchParams.set('from', provider);
    for (const param of sensitiveParams) {
      nextUrl.searchParams.delete(param);
    }

    console.log('[callback] Redirecting to:', nextUrl.toString());
    return redirectWithCookies(nextUrl);
  }

  // No code - redirect to next
  const fallbackUrl = new URL(next, origin);
  return redirectWithCookies(fallbackUrl);
}
