// apps/web/lib/spotifyExport.ts
// Minimal, ready-to-paste TypeScript function to create a Spotify playlist and add tracks.

async function parseErrorBody(res: Response): Promise<string | null> {
  try {
    const body = await res.json().catch(() => null);
    if (!body) return null;
    if (body.error) {
      if (typeof body.error === 'string') return body.error;
      return body.error.message ?? JSON.stringify(body.error);
    }
    return body.message ?? JSON.stringify(body);
  } catch {
    return null;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Create a Spotify playlist for the current user and add provided track URIs.
 * Returns the created playlist id on success.
 * Throws descriptive errors (HTTP status + Spotify message) on failure.
 */
export async function exportPlaylistToSpotify(
  customName: string,
  uris: string[],
  token: string
): Promise<string> {
  if (!customName || typeof customName !== 'string') {
    throw new Error('Invalid customName: must be a non-empty string.');
  }
  if (!Array.isArray(uris)) {
    throw new Error('Invalid uris: must be an array of Spotify track URIs.');
  }
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token: must be a Spotify access token string.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  async function ensureOk(res: Response, context: string) {
    if (res.ok) return;
    const spotifyMessage = await parseErrorBody(res);
    const bodyText = spotifyMessage ? ` - ${spotifyMessage}` : '';
    throw new Error(`${context} failed: ${res.status} ${res.statusText}${bodyText}`);
  }

  // 1) Get current user id
  const meRes = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers,
  });
  await ensureOk(meRes, 'Get current user');
  const meJson = await meRes.json() as { id?: string };
  const userId: string | undefined = meJson?.id;
  if (!userId) throw new Error('Failed to obtain Spotify user id from /v1/me response.');

  // 2) Create playlist for the user
  const createBody = {
    name: customName,
    public: false,
    description: 'Created via Vybe',
  };
  const createRes = await fetch(
    `https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(createBody),
    }
  );
  await ensureOk(createRes, 'Create playlist');
  const createJson = await createRes.json() as { id?: string };
  const playlistId: string | undefined = createJson?.id;
  if (!playlistId) throw new Error('Playlist created but Spotify did not return an id.');

  // 3) Add tracks in batches (100 max per request)
  const BATCH_SIZE = 100;
  const batches = chunkArray(uris, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ uris: batch }),
      }
    );
    await ensureOk(addRes, `Add tracks (batch ${i + 1}/${batches.length})`);
  }

  return playlistId;
}
