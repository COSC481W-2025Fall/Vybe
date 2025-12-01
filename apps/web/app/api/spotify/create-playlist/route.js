import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/spotify';

// Spotify IDs are Base62 encoded, alphanumeric only (22 characters typically)
const SPOTIFY_ID_REGEX = /^[a-zA-Z0-9]{1,50}$/;

// Create a new playlist in the user's Spotify account and copy tracks from an existing playlist
export async function POST(request) {
  try {
    const supabase = supabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { playlistId, newPlaylistName } = body || {};
    if (!playlistId || !newPlaylistName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Validate playlistId format to prevent SSRF attacks
    if (typeof playlistId !== 'string' || !SPOTIFY_ID_REGEX.test(playlistId)) {
      return NextResponse.json({ error: 'Invalid playlist ID format' }, { status: 400 });
    }

    // Sanitize newPlaylistName (limit length, remove control characters)
    const sanitizedName = String(newPlaylistName).slice(0, 200).replace(/[\x00-\x1F\x7F]/g, '');
    if (!sanitizedName.trim()) {
      return NextResponse.json({ error: 'Invalid playlist name' }, { status: 400 });
    }

    const userId = session.user.id;

    // Obtain a valid access token (refresh if necessary)
    const accessToken = await getValidAccessToken(supabase, userId);

    // Fetch source playlist metadata (for description) and tracks (paginated)
    const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!playlistRes.ok) throw new Error('Failed to fetch source playlist');
    const playlistJson = await playlistRes.json();

    const tracks = [];
    let nextUrl = playlistJson.tracks?.href;
    while (nextUrl) {
      const tr = await fetch(nextUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!tr.ok) throw new Error('Failed to fetch playlist tracks');
      const trj = await tr.json();
      trj.items.forEach(item => {
        if (item.track && item.track.id) tracks.push(item.track.id);
      });
      nextUrl = trj.next;
    }

    // Create playlist in user's account (use /me/playlists)
    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitizedName,
        description: `Imported from Vybe • source: ${playlistJson.name || playlistId}`,
        public: false,
      }),
    });
    if (!createRes.ok) {
      const txt = await createRes.text().catch(() => '');
      throw new Error(`Failed to create playlist: ${createRes.status} ${txt}`);
    }
    const created = await createRes.json();

    // Add tracks in batches (max 100 per request) using track URIs
    const batchSize = 100;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const slice = tracks.slice(i, i + batchSize).map(id => `spotify:track:${id}`);
      const addRes = await fetch(`https://api.spotify.com/v1/playlists/${created.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: slice }),
      });
      if (!addRes.ok) {
        const txt = await addRes.text().catch(() => '');
        throw new Error(`Failed to add tracks: ${addRes.status} ${txt}`);
      }
    }

    return NextResponse.json({ success: true, playlist: { id: created.id, url: created.external_urls?.spotify || null } });
  } catch (err) {
    console.error('create-playlist error', err);
    return NextResponse.json({ error: err.message || 'Failed to create playlist' }, { status: 500 });
  }
}
