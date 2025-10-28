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

async function handler(req, { params }) {
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
    return new NextResponse(JSON.stringify({ error: 'token_error', message: 'An unexpected error occurred.' }), { status: 401 });
  }

  const path = params?.path?.join('/') ?? 'youtube/v3/channels?part=id&mine=true';
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



