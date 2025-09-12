// app/api/spotify/[...path]/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/lib/spotify';

const BASE = 'https://api.spotify.com';

export const dynamic = 'force-dynamic'; // helpful in dev so responses don't get cached

async function handler(req, { params }) {
  // ✅ Next 15: await cookies()
  const cookieStore = await cookies();
  const sb = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // get or refresh a valid Spotify access token (your helper)
  const token = await getValidAccessToken(sb, user.id);

  const path = params?.path?.join('/') ?? 'me';
  const target = `${BASE}/v1/${path}${req.nextUrl.search}`;

  const init = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      // forward content-type only if present (don’t force it)
      'content-type': req.headers.get('content-type') || undefined,
    },
  };

  // only forward a body for non-GET requests
  if (req.method !== 'GET') {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    },
  });
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
