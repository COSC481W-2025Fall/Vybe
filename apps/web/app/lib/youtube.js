// apps/web/app/lib/youtube.js
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function basicAuthBody(params) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    ...params,
  });
  return body;
}

export async function getTokensRow(sb, userId) {
  const { data, error } = await sb
    .from('youtube_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertTokens(sb, userId, tokens) {
  const { error } = await sb
    .from('youtube_tokens')
    .upsert({ user_id: userId, ...tokens })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function refreshAccessToken(refresh_token) {
  const body = basicAuthBody({
    grant_type: 'refresh_token',
    refresh_token,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to refresh Google token: ${res.status} ${txt}`);
  }
  return res.json(); // { access_token, expires_in, refresh_token? }
}

/** Return a valid YouTube access token; refresh & save if needed */
export async function getValidAccessToken(sb, userId) {
  console.log('[getValidAccessToken] Looking for tokens for user:', userId);

  // First, try to get the current session to see if we have a valid token
  const { data: { session }, error: sessionError } = await sb.auth.getSession();

  if (sessionError) {
    console.log('[getValidAccessToken] Session error:', sessionError);
    throw new Error('No valid session');
  }

  // Check if we have a provider token from the current session
  if (session?.provider_token) {
    console.log('[getValidAccessToken] Using session provider token');
    return session.provider_token;
  }

  // Fallback to stored tokens
  const { data: row, error } = await sb
    .from('youtube_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.log('[getValidAccessToken] Database query result:', { row, error });

  if (error || !row?.refresh_token) {
    console.log('[getValidAccessToken] No valid tokens found:', { error, hasRefreshToken: !!row?.refresh_token });
    throw new Error('No YouTube tokens on file');
  }

  const now = Math.floor(Date.now() / 1000) + 60; // 1 min leeway
  if (row.access_token && row.expires_at > now) {
    return row.access_token;
  }

  const refreshed = await refreshAccessToken(row.refresh_token);

  await sb.from('youtube_tokens').upsert({
    user_id: userId,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || row.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600),
    scope: refreshed.scope,
    token_type: refreshed.token_type || 'Bearer',
  });

  return refreshed.access_token;
}



