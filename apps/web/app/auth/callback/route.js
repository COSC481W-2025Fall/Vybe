// app/auth/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  if (code) {
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[callback] session user:', session?.user?.id);
    console.log('[callback] provider:', session?.user?.app_metadata?.provider);
    console.log('[callback] exchangeCodeForSession has session:', !!sessionData?.session);
    console.log('[callback] exchangeCodeForSession provider_token:', !!sessionData?.session?.provider_token);

    // Try to get tokens from exchangeCodeForSession response
    const accessToken = sessionData?.session?.provider_token || session?.provider_token || null;
    const refreshToken = sessionData?.session?.provider_refresh_token || session?.provider_refresh_token || null;

    console.log('[callback] has provider_token:', !!accessToken);
    console.log('[callback] has provider_refresh_token:', !!refreshToken);

    if (session?.user) {
      const userId = session.user.id;
      const provider = session.user?.app_metadata?.provider || null;
      const expiresIn = sessionData?.session?.provider_token_expires_in || session?.provider_token_expires_in || 3600;
      const scope = sessionData?.session?.provider_scope || session?.provider_scope || null;

      console.log('[callback] Processing tokens for provider:', provider);

      // Extract profile picture from OAuth user metadata
      const avatarUrl = session.user?.user_metadata?.avatar_url ||
                        session.user?.user_metadata?.picture ||
                        null;

      // Update user profile picture if we got one from OAuth
      if (avatarUrl) {
        await supabase
          .from('users')
          .update({ profile_picture_url: avatarUrl })
          .eq('id', userId);
      }

      // Store OAuth tokens in appropriate table based on provider
      if (provider === 'spotify') {
        await supabase.from('spotify_tokens').upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          scope,
          token_type: 'Bearer',
        }, { onConflict: 'user_id' });
      } else if (provider === 'google') {
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
          console.error('[callback] Error storing YouTube tokens:', tokenError);
        } else {
          console.log('[callback] Successfully stored YouTube tokens');
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
