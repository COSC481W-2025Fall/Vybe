// app/auth/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const intendedProvider = url.searchParams.get('provider'); // The provider button that was clicked

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

      // Use the provider parameter from the URL (set by the login button that was clicked)
      // This is the most reliable way to know which provider the user intended to use
      const provider = intendedProvider || session.user?.app_metadata?.provider || null;

      const expiresIn = sessionData?.session?.provider_token_expires_in || session?.provider_token_expires_in || 3600;
      const scope = sessionData?.session?.provider_scope || session?.provider_scope || null;

      console.log('[callback] Intended provider from button click:', intendedProvider);
      console.log('[callback] Using provider:', provider);

      // Extract profile picture from OAuth user metadata
      const avatarUrl = session.user?.user_metadata?.avatar_url ||
                        session.user?.user_metadata?.picture ||
                        null;

      // First check if user exists in our users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      console.log('[callback] User exists in users table:', !!existingUser, 'Error:', checkError);

      // Update user profile picture and last_used_provider
      const updateData = {
        last_used_provider: provider,
        updated_at: new Date().toISOString()  // Set updated_at manually to satisfy trigger
      };
      if (avatarUrl) {
        updateData.profile_picture_url = avatarUrl;
      }

      console.log('[callback] Updating user', userId, 'with data:', updateData);

      // Use UPDATE instead of UPSERT to avoid username requirement
      // The user should already exist from the auth trigger
      const { data: upsertData, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('[callback] Error updating user:', updateError);
        console.error('[callback] Full error details:', JSON.stringify(updateError, null, 2));
      } else {
        console.log('[callback] Successfully updated last_used_provider to:', provider);
        console.log('[callback] Upsert result:', upsertData);
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

      // Add provider to redirect URL so the library knows which service to use
      if (provider) {
        const nextUrl = new URL(next, request.url);

        // Always add the 'from' parameter to track which provider they logged in with
        nextUrl.searchParams.set('from', provider);

        console.log('[callback] Redirecting to:', nextUrl.toString());
        return NextResponse.redirect(nextUrl);
      }
    }
  }

  // Fallback redirect without provider parameter
  console.log('[callback] No provider found, redirecting to:', next);
  return NextResponse.redirect(new URL(next, request.url));
}
