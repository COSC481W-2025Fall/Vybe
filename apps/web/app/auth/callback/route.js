// app/auth/callback/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * This route handles OAuth callbacks from various providers (Spotify, Google, etc.)
 * It exchanges authorization codes for sessions and stores provider-specific tokens
 */
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  if (code) {
    // Exchange the authorization code for a session
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[callback] session user:', session?.user?.id);
    
    if (session?.user) {
      const userId = session.user.id;
      const accessToken = session.provider_token ?? null;
      const refreshToken = session.provider_refresh_token ?? null;
      const expiresIn = session.provider_token_expires_in ?? 3600;
      const scope = session.provider_scope ?? null;
      
      // Determine which provider the user signed in with
      const provider = session.user.app_metadata?.provider || 'unknown';
      console.log('[callback] provider:', provider);

      // Store tokens in the appropriate table based on the provider
      if (provider === 'spotify' && accessToken) {
        // Store Spotify tokens
        await supabase.from('spotify_tokens').upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken, // Must be non-null to carry new scopes
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          scope,
          token_type: 'Bearer',
        }, { onConflict: 'user_id' });
        
        console.log('[callback] Spotify tokens stored for user:', userId);
        
      } else if (provider === 'google' && accessToken) {
        // Store Google tokens
        await supabase.from('google_tokens').upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          scope,
          token_type: 'Bearer',
        }, { onConflict: 'user_id' });
        
        console.log('[callback] Google tokens stored for user:', userId);
      }
    }
  }

  // Redirect to the intended destination or default to library
  return NextResponse.redirect(new URL(next, request.url));
}
