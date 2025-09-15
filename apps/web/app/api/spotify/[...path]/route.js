import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/app/lib/spotify'; // make sure this path is correct

const BASE = 'https://api.spotify.com';

export const dynamic = 'force-dynamic'; // avoid caching during dev

async function makeSupabase() {
  // ✅ Next 15+: await cookies() and pass a *function* that returns the store
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

async function handler(req, { params }) {
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
    console.error('[proxy] token error:', e);
    return new NextResponse(JSON.stringify({ error: 'token_error', message: String(e) }), { status: 401 });
  }

  const path = params?.path?.join('/') ?? 'me';
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
