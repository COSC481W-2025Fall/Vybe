import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/lib/spotify';

const BASE = 'https://api.spotify.com';

export const dynamic = 'force-dynamic'; // avoid caching during dev

async function makeSupabase() {
  // ✅ Next 15+: await cookies() and pass a *function* that returns the store
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

async function handler(req, context) {
  const sb = await makeSupabase();

  // who is the user (from your own app session)?
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  // get or refresh a valid Spotify access token from your DB
  let accessToken;
  try {
    accessToken = await getValidAccessToken(sb, user.id);
  } catch (e) {
    // Log full error details on the server for debugging
    console.error('[proxy] token error:', e);
<<<<<<< HEAD
    // Respond with a generic error message to the client
    return new NextResponse(JSON.stringify({ error: 'token_error', message: 'An unexpected error occurred.' }), { status: 401 });
=======
    
    // Return a more helpful error message to the client
    const errorMessage = e.code === 'NO_TOKENS' 
      ? e.message 
      : 'An unexpected error occurred while accessing Spotify. Please try reconnecting your account.';
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'token_error', 
        message: errorMessage,
        code: e.code || 'UNKNOWN_ERROR'
      }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
>>>>>>> 2cf79ae775545c31935108f06979a795fe08bdad
  }

  const params = await context.params;
  const path = Array.isArray(params?.path) ? params.path.join('/') : 'me';
  const target = `${BASE}/v1/${path}${req.nextUrl.search}`;

  const init = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,              // 👈 must be a *string token*
      'content-type': req.headers.get('content-type') || undefined,
    },
  };

  // only forward a body for non-GET requests
  if (req.method !== 'GET') {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);

  // pipe Spotify’s response (helps debugging)
  const text = await upstream.text();
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
