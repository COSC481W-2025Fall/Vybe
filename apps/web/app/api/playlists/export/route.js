// apps/web/app/api/playlists/export/route.js
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

async function fetchJson(url, token) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (r.status === 401) {
    const text = await r.text().catch(() => '');
    throw new Response(
      JSON.stringify({ error: 'spotify_unauthorized', details: text }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Response(
      JSON.stringify({ error: 'spotify_error', status: r.status, details: text }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
  return r.json();
}

async function getAllPaginated(fetchPageFn) {
  const items = [];
  let nextUrl = null;

  // first page
  let page = await fetchPageFn();
  if (!page || !page.items) return items;

  items.push(...page.items);
  nextUrl = page.next;

  // follow "next" pages
  while (nextUrl) {
    page = await fetchPageFn(nextUrl);
    if (!page || !page.items || page.items.length === 0) break;
    items.push(...page.items);
    nextUrl = page.next;
  }
  return items;
}

function simplifyTrackItem(item) {
  const t = item?.track;
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists || []).map(a => ({ id: a.id, name: a.name })),
    album: t.album ? { id: t.album.id, name: t.album.name } : null,
    duration_ms: t.duration_ms,
    external_urls: t.external_urls || {},
    preview_url: t.preview_url || null,
    added_at: item.added_at || null,
  };
}

function pickSpotifyAccessToken(session, user) {
  // Primary (typical): Supabase exposes provider access token on session
  const s = session || {};
  if (s.provider_token && typeof s.provider_token === 'string') return s.provider_token;
  if (s.provider_token && s.provider_token.access_token) return s.provider_token.access_token;
  if (s.access_token) return s.access_token;

  // Fallback: look in identities
  const identities = user?.identities || [];
  const sp = identities.find(i => (i.provider || '').toLowerCase() === 'spotify');
  const tokenFromIdentity = sp?.identity_data?.access_token;
  if (tokenFromIdentity) return tokenFromIdentity;

  return null;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const [{ data: sessionData, error: sessionErr }, { data: userData, error: userErr }] =
    await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  if (sessionErr) {
    return Response.json({ error: 'session_error', details: sessionErr.message }, { status: 500 });
  }
  if (userErr) {
    return Response.json({ error: 'user_error', details: userErr.message }, { status: 500 });
  }

  const session = sessionData?.session;
  if (!session) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const accessToken = pickSpotifyAccessToken(session, userData?.user);
  if (!accessToken) {
    return Response.json(
      {
        error: 'no_spotify_token',
        message:
          'No Spotify access token found. Please re-connect Spotify with playlist-read scopes.',
      },
      { status: 401 }
    );
  }

  try {
    // 1) Get ALL playlists for the user
    const firstPlaylistsUrl = 'https://api.spotify.com/v1/me/playlists?limit=50';
    const playlistsRaw = await getAllPaginated((url) => fetchJson(url || firstPlaylistsUrl, accessToken));

    // 2) For each playlist, get ALL tracks
    const result = [];
    for (const p of playlistsRaw) {
      const playlistId = p.id;
      const firstTracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
      const tracksRaw = await getAllPaginated((url) => fetchJson(url || firstTracksUrl, accessToken));
      const tracks = tracksRaw.map(simplifyTrackItem).filter(Boolean);

      result.push({
        id: playlistId,
        name: p.name,
        description: p.description,
        public: p.public,
        collaborative: p.collaborative,
        owner: p.owner ? { id: p.owner.id, display_name: p.owner.display_name } : null,
        snapshot_id: p.snapshot_id,
        images: p.images || [],
        external_urls: p.external_urls || {},
        total_tracks: tracks.length,
        tracks,
      });
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-disposition': 'attachment; filename="playlists.json"',
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'unexpected', details: String(e?.message || e) }, { status: 500 });
  }
}
