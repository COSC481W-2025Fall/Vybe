# Spotify OAuth Deployment Setup Guide

## Critical Deployment Issues

### 1. **Redirect URI Mismatch** (Most Common Issue)

When using Supabase OAuth, Spotify sees **Supabase's redirect URI**, not your app's callback URL.

**Supabase's redirect URI format:**
```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

**Your app's callback URL:**
```
https://yourdomain.com/auth/callback
```

**Problem:** When we try to manually exchange the authorization code, the redirect URI must match **exactly** what Spotify expects, which is Supabase's URL, not yours.

### 2. **Spotify App Configuration**

In your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):

1. Go to your app settings
2. Add **BOTH** redirect URIs to "Redirect URIs":
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase's URL)
   - `https://yourdomain.com/auth/callback` (Your app's URL - optional, for manual exchange)

**Required:**
- ✅ `https://<your-project-ref>.supabase.co/auth/v1/callback`

**Optional (if doing manual exchange):**
- `https://yourdomain.com/auth/callback`

### 3. **Environment Variables**

Ensure these are set in your production environment:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. **Supabase Configuration**

In your Supabase Dashboard:

1. Go to **Authentication > Providers > Spotify**
2. Enable Spotify provider
3. Add your Spotify Client ID and Secret
4. **Important:** Check "Store provider tokens" or similar option (if available)
   - This allows Supabase to pass `provider_token` and `provider_refresh_token` in the session

### 5. **Database Permissions**

Ensure your `spotify_tokens` table has proper RLS (Row Level Security) policies:

```sql
-- Allow users to insert their own tokens
CREATE POLICY "Users can insert their own tokens"
ON spotify_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own tokens
CREATE POLICY "Users can update their own tokens"
ON spotify_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to read their own tokens
CREATE POLICY "Users can read their own tokens"
ON spotify_tokens FOR SELECT
USING (auth.uid() = user_id);
```

## Solution: Use Supabase's Redirect URI

The callback route should use Supabase's redirect URI when exchanging the code:

```javascript
// Get Supabase project URL from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseRedirectUri = `${supabaseUrl}/auth/v1/callback`;

// Use this when exchanging the code
const tokenData = await exchangeSpotifyCode(code, supabaseRedirectUri);
```

## Debugging Steps

1. **Check server logs** for:
   - `[callback] Attempting code exchange with redirectUri: ...`
   - `[callback] Failed to exchange Spotify code manually: ...`
   - `[callback] Successfully exchanged Spotify code for tokens`

2. **Verify environment variables** are set:
   ```bash
   # In your deployment platform
   echo $SPOTIFY_CLIENT_ID
   echo $SPOTIFY_CLIENT_SECRET
   ```

3. **Check Spotify app settings** - ensure redirect URI matches Supabase's URL

4. **Test token storage** - check if tokens are being saved to database:
   ```sql
   SELECT user_id, 
          CASE WHEN access_token IS NOT NULL THEN 'has token' ELSE 'no token' END as token_status,
          CASE WHEN refresh_token IS NOT NULL THEN 'has refresh' ELSE 'no refresh' END as refresh_status
   FROM spotify_tokens
   WHERE user_id = 'your-user-id';
   ```

## Alternative: Configure Supabase to Store Tokens

If manual code exchange continues to fail, configure Supabase to automatically store provider tokens:

1. In Supabase Dashboard > Authentication > Settings
2. Enable "Store provider tokens" (if available)
3. Tokens will be available in `session.provider_token` and `session.provider_refresh_token`

Then update the callback to use Supabase's tokens instead of manual exchange.

