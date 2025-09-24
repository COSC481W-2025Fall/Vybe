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
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('[callback] session user:', session?.user?.id)
    if (session?.user) {
      const userId = session.user.id;
      const accessToken  = session.provider_token ?? null;
      const refreshToken = session.provider_refresh_token ?? null;  // must be non-null to “upgrade”
      const expiresIn    = session.provider_token_expires_in ?? 3600;
      const scope        = session.provider_scope ?? null;

      // overwrite the row with the latest token info
      await supabase.from('spotify_tokens').upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken, // <-- NEEDS to be non-null to carry new scopes
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        scope,
        token_type: 'Bearer',
      }, { onConflict: 'user_id' });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
