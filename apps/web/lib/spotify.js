const TOKEN_URL = 'https://accounts.spotify.com/api/token';

function basicAuth() {
  const creds = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return 'Basic ' + Buffer.from(creds).toString('base64');
}

export async function getTokensRow(sb, userId) {
  const { data, error } = await sb
    .from('spotify_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertTokens(sb, userId, tokens) {
  const { error } = await sb
    .from('spotify_tokens')
    .upsert({ user_id: userId, ...tokens })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function refreshAccessToken(refresh_token) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to refresh Spotify token: ${res.status} ${txt}`);
  }
  return res.json(); // { access_token, expires_in, refresh_token? }
}

/** Returns a fresh access token, refreshing & saving if needed */
export async function getValidAccessToken(sb, userId) {
  let row = await getTokensRow(sb, userId);
  if (!row || !row.refresh_token) throw new Error('No Spotify tokens on file');

  const now = Math.floor(Date.now() / 1000) + 60; // 1 min leeway
  if (!row.access_token || row.expires_at <= now) {
    const refreshed = await refreshAccessToken(row.refresh_token);
    row.access_token = refreshed.access_token;
    row.expires_at = Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600);
    row.refresh_token = refreshed.refresh_token || row.refresh_token;
    await upsertTokens(sb, userId, row);
  }
  return row.access_token;
}
