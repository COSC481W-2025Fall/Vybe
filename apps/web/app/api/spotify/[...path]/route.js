// apps/web/app/api/spotify/[...path]/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/spotify';

const BASE = 'https://api.spotify.com/';

async function handler(req, { params }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getValidAccessToken(sb, user.id);
  const target = `${BASE}${params.path.join('/')}${req.nextUrl.search}`;

  const res = await fetch(target, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': req.headers.get('content-type') || undefined,
    },
    body: req.method === 'GET' ? undefined : await req.text(),
  });

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
