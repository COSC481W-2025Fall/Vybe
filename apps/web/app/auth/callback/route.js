// app/auth/callback/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * Validates and sanitizes a redirect path to prevent open redirect vulnerabilities
 * @param {string} path - The redirect path to validate
 * @param {URL} baseUrl - The base URL to resolve relative paths against
 * @returns {URL} A safe redirect URL or the default path
 */
function getSafeRedirectUrl(path, baseUrl) {
  // Default to home if no path provided
  const defaultPath = '/';
  
  if (!path) {
    return new URL(defaultPath, baseUrl);
  }

  // Validate that path is a relative path (prevents open redirect)
  // Must start with / and not contain protocol schemes (http://, https://, //)
  if (path.startsWith('/') && !path.match(/^\/\/|^https?:\/\//i)) {
    try {
      const dest = new URL(path, baseUrl);
      // Double-check the origin matches (prevents protocol-relative URLs)
      if (dest.origin === baseUrl.origin) {
        return dest;
      }
    } catch {
      // URL parsing failed, use default
    }
  }
  
  // If validation fails, return default path
  return new URL(defaultPath, baseUrl);
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[callback] session user:', session?.user?.id)
    if (session?.user) {
      const userId = session.user.id;
      const provider = session.user?.app_metadata?.provider || null;
      const accessToken  = session.provider_token ?? null;
      const refreshToken = session.provider_refresh_token ?? null;  // must be non-null to "upgrade"
      const expiresIn    = session.provider_token_expires_in ?? 3600;
      const scope        = session.provider_scope ?? null;

      // overwrite the row with the latest token info based on provider
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
        await supabase.from('youtube_tokens').upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          scope,
          token_type: 'Bearer',
        }, { onConflict: 'user_id' });
      }
    }
  }

  const safeRedirectUrl = getSafeRedirectUrl(next, request.url);
  return NextResponse.redirect(safeRedirectUrl);
}
