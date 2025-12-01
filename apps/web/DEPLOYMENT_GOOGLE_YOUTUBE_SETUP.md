# Google/YouTube OAuth Setup Guide for Supabase

## Overview
This guide walks you through setting up Google OAuth with Supabase to enable YouTube integration in your Vybe application.

---

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in required fields:
     - App name: "Vybe"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
   - **IMPORTANT:** Add test users (see Step 1.5 below)
   - Save and continue

5.5. **Add Test Users (CRITICAL for Testing Mode):**
   - After creating the OAuth consent screen, go to **APIs & Services > OAuth consent screen**
   - Scroll down to **Test users** section
   - Click **+ ADD USERS**
   - Add your email address: `vasanth.anbukumar@gmail.com` (or any email you'll use to test)
   - Add any other test user emails
   - Click **Save**
   - **Note:** Only these test users can access the app while it's in testing mode

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Vybe Web Client"
   - **Authorized redirect URIs**: Add these:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback  (for local development)
     ```
   - Click **Create**
   - **Save your Client ID and Client Secret** (you'll need these)

---

## Step 2: Enable YouTube Data API v3

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "YouTube Data API v3"
3. Click on it and click **Enable**
4. This allows your app to access YouTube data

---

## Step 3: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication > Providers**
4. Find **Google** in the list
5. Click to enable and configure:
   - **Enable Google provider**: Toggle ON
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
   - **Authorized Client IDs**: Leave empty (or add if you have multiple)
6. Click **Save**

---

## Step 4: Add Redirect URI to Google Console

**CRITICAL:** After setting up Supabase, you need to add Supabase's redirect URI to Google:

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your actual Supabase project reference.
   
   You can find your project ref in:
   - Supabase Dashboard > Settings > API
   - It's the part before `.supabase.co` in your Supabase URL

5. Click **Save**

---

## Step 5: Environment Variables

Add these to your `.env.local` (for local) and production environment:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Step 6: Verify Database Tables

Ensure you have a `youtube_tokens` table for storing tokens:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'youtube_tokens';

-- If it doesn't exist, create it:
CREATE TABLE IF NOT EXISTS youtube_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE youtube_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own tokens"
ON youtube_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON youtube_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own tokens"
ON youtube_tokens FOR SELECT
USING (auth.uid() = user_id);
```

---

## Step 7: Testing the Setup

1. **Local Testing:**
   - Start your dev server: `npm run dev`
   - Navigate to `/sign-in` or `/library`
   - Click "Sign in with Google"
   - You should be redirected to Google's consent screen
   - After authorizing, you should be redirected back to your app

2. **Check Token Storage:**
   ```sql
   SELECT user_id, 
          CASE WHEN access_token IS NOT NULL THEN 'has token' ELSE 'no token' END as token_status,
          CASE WHEN refresh_token IS NOT NULL THEN 'has refresh' ELSE 'no refresh' END as refresh_status,
          expires_at
   FROM youtube_tokens
   WHERE user_id = 'your-user-id';
   ```

3. **Check Console Logs:**
   Look for these messages in your server logs:
   - `[callback] Storing Google tokens: ...`
   - `[callback] Successfully stored YouTube tokens`

---

## Common Issues & Solutions

### Issue 1: "redirect_uri_mismatch" Error

**Problem:** Google says the redirect URI doesn't match.

**Solution:**
1. Check that you added the exact Supabase redirect URI to Google Console:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
2. Make sure there are no trailing slashes
3. Verify your Supabase project ref is correct

### Issue 2: "access_denied" or "has not completed Google verification" Error

**Problem:** User is not a test user, or OAuth consent screen isn't configured.

**Solution:**
1. **If app is in Testing mode:**
   - Go to Google Cloud Console > **APIs & Services > OAuth consent screen**
   - Scroll to **Test users** section
   - Click **+ ADD USERS**
   - Add the email address you're using to sign in (e.g., `vasanth.anbukumar@gmail.com`)
   - Click **Save**
   - Try signing in again with that email

2. **If you want to allow all users (for production):**
   - Go to OAuth consent screen
   - Click **PUBLISH APP** button
   - Confirm publishing
   - **Note:** This may require app verification if using sensitive scopes

3. Verify all required scopes are added to consent screen
4. Check that YouTube Data API v3 is enabled

### Issue 3: Tokens Not Storing

**Problem:** Authentication works but tokens aren't saved to database.

**Solution:**
1. Check `youtube_tokens` table exists
2. Verify RLS policies are correct
3. Check server logs for error messages
4. Ensure callback route is handling Google provider correctly

### Issue 4: "Invalid Client" Error

**Problem:** Google says client ID or secret is invalid.

**Solution:**
1. Double-check Client ID and Secret in Supabase dashboard
2. Make sure you copied the entire secret (no extra spaces)
3. Verify credentials are for the correct Google Cloud project

---

## Verification Checklist

- [ ] Google OAuth credentials created
- [ ] OAuth consent screen configured with required scopes
- [ ] YouTube Data API v3 enabled
- [ ] Supabase redirect URI added to Google Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret added to Supabase
- [ ] Environment variables set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] `youtube_tokens` table exists with RLS policies
- [ ] Test authentication flow works
- [ ] Tokens are being stored in database

---

## Production Deployment

When deploying to production:

1. **Update Google Console:**
   - Add your production domain to authorized redirect URIs:
     ```
     https://yourdomain.com/auth/callback
     ```
   - Update OAuth consent screen with production domain

2. **Update Environment Variables:**
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your hosting platform
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` points to production Supabase

3. **Verify Supabase Settings:**
   - Production Supabase project has Google provider configured
   - Redirect URI in Supabase matches what's in Google Console

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
