import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/lib/youtube';

const BASE = 'https://www.googleapis.com';

export const dynamic = 'force-dynamic';

async function makeSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

async function handler(req, context) {
  const sb = await makeSupabase();

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  let accessToken;
  try {
    accessToken = await getValidAccessToken(sb, user.id);
  } catch (e) {
    console.error('[yt-proxy] token error:', e);
    // Check if this is a token refresh/auth issue
    const isAuthError = e.message?.includes('No YouTube tokens') || 
                        e.message?.includes('refresh') || 
                        e.message?.includes('No valid session');
    return new NextResponse(JSON.stringify({ 
      error: 'token_error', 
      message: isAuthError 
        ? 'Your YouTube session has expired. Please sign out and sign back in with Google to reconnect.'
        : 'An unexpected error occurred.',
      requiresReauth: isAuthError
    }), { status: 401 });
  }

  const params = await context.params;
  const path = Array.isArray(params?.path) ? params.path.join('/') : 'youtube/v3/channels?part=id&mine=true';
  const target = `${BASE}/${path}${req.nextUrl.search}`;

  const init = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': req.headers.get('content-type') || undefined,
    },
  };

  if (req.method !== 'GET') {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);
  const text = await upstream.text();
  
  // If YouTube returns 401, the token might have been revoked or expired
  if (upstream.status === 401) {
    console.error('[yt-proxy] YouTube returned 401:', text);
    return new NextResponse(JSON.stringify({ 
      error: 'youtube_auth_error', 
      message: 'Your YouTube authorization has expired. Please sign out and sign back in with Google to reconnect.',
      requiresReauth: true,
      upstream: text
    }), { 
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;



