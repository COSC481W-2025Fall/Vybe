import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = supabaseServer();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playlistId } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Only Spotify export supported
    const playlistData = await fetchSpotifyPlaylist(supabase, playlistId, session.user.id);

    return NextResponse.json({ success: true, playlist: playlistData });
  } catch (err) {
    console.error('export-playlist error', err);
    return NextResponse.json({ error: err.message || 'Failed to export playlist' }, { status: 500 });
  }
}

async function fetchSpotifyPlaylist(supabase, playlistId, userId) {
  const { data: tokenData } = await supabase
    .from('spotify_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (!tokenData?.access_token) throw new Error('Spotify not connected');

  const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!playlistResponse.ok) throw new Error('Failed to fetch Spotify playlist');
  const playlistJson = await playlistResponse.json();

  const tracks = [];
  let nextUrl = playlistJson.tracks.href;

  while (nextUrl) {
    const tracksResponse = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!tracksResponse.ok) throw new Error('Failed to fetch playlist tracks');
    const tracksData = await tracksResponse.json();

    tracksData.items.forEach(item => {
      if (item.track) {
        tracks.push({
          id: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          thumbnail: item.track.album.images[0]?.url || null,
          duration_seconds: Math.floor(item.track.duration_ms / 1000),
          position: tracks.length + 1,
        });
      }
    });

    nextUrl = tracksData.next;
  }

  return { id: playlistJson.id, name: playlistJson.name, description: playlistJson.description || '', tracks };
}

// Removed YouTube support: export currently only supports Spotify
