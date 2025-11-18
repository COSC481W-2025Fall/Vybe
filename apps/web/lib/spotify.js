// apps/web/lib/spotify.js
import { CONFIG } from '../config/constants.js';

const TOKEN_URL = CONFIG.SPOTIFY_TOKEN_URL;

function basicAuth() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
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

/** Return a valid access token; refresh & save if needed */
export async function getValidAccessToken(sb, userId) {
  const { data: row, error } = await sb
    .from('spotify_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // Database error or no row found
    const errorMessage = error.code === 'PGRST116' 
      ? 'No Spotify account connected. Please connect your Spotify account in Settings.'
      : `Database error: ${error.message}`;
    const err = new Error(errorMessage);
    err.code = 'NO_TOKENS';
    throw err;
  }

  if (!row?.refresh_token) {
    const err = new Error('No Spotify account connected. Please connect your Spotify account in Settings.');
    err.code = 'NO_TOKENS';
    throw err;
  }

  const now = Math.floor(Date.now() / 1000) + 60; // 1 min leeway
  if (row.access_token && row.expires_at > now) {
    return row.access_token;                      // 👈 return *string*
  }

  const refreshed = await refreshAccessToken(row.refresh_token); // fetch to Spotify token endpoint

  await sb.from('spotify_tokens').upsert({
    user_id: userId,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || row.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
    scope: refreshed.scope,
    token_type: refreshed.token_type,
  });

  return refreshed.access_token;                  // 👈 return *string*
}
