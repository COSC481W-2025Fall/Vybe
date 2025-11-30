# Smart Sorting Setup Guide

This document describes how to set up the OpenAI-powered smart sorting feature for playlists.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Last.fm API Key (optional but recommended)
# Get a free API key at: https://www.last.fm/api/account/create
LASTFM_API_KEY=your-lastfm-api-key-here

# MusicBrainz User Agent (required if using MusicBrainz)
# Format: "YourAppName/Version (contact email or website)"
MUSICBRAINZ_USER_AGENT=Vybe/1.0 (https://vybe.app)
```

## API Keys Setup

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Create a new API key
4. Copy the key and add it to `.env.local`

**Note**: OpenAI API usage incurs costs. The implementation uses `gpt-4o-mini` for cost efficiency.

### Last.fm API Key (Optional)
1. Go to https://www.last.fm/api/account/create
2. Fill out the application form
3. Copy the API key and add it to `.env.local`

**Benefits**: Provides genre tags and play counts for both Spotify and YouTube songs.

### MusicBrainz User Agent (Optional)
MusicBrainz requires a User-Agent header but doesn't require an API key. The format should be:
```
YourAppName/Version (contact information)
```

Example: `Vybe/1.0 (contact@vybe.app)`

**Benefits**: Provides additional genre tags and metadata.

## How It Works

1. **Automatic Trigger**: When a playlist is imported to a group, smart sorting is automatically triggered in the background.

2. **Metadata Collection**: The system fetches metadata from:
   - Spotify API (for Spotify tracks - requires user's Spotify connection)
   - Last.fm API (for all tracks - requires API key)
   - MusicBrainz API (for all tracks - no API key needed)

3. **AI Analysis**: OpenAI analyzes the collected metadata (genres, artists, popularity) and determines optimal ordering.

4. **Database Update**: The new ordering is saved to the database in `smart_sorted_order` columns.

5. **Display**: The frontend automatically displays songs and playlists using the smart-sorted order when available.

## Manual Trigger

You can also manually trigger smart sorting by calling:
```
POST /api/groups/[groupId]/smart-sort
```

## Database Migration

Run the migration to add the required columns:
```sql
-- Located in: apps/web/supabase/migrations/007_add_smart_sorting.sql
```

This adds:
- `smart_sorted_order` to `group_playlists` table
- `smart_sorted_order` to `playlist_songs` table
- `last_sorted_at` timestamp to `group_playlists` table

## Cost Considerations

- **OpenAI API**: Costs depend on usage. `gpt-4o-mini` is used for cost efficiency.
- **Last.fm API**: Free tier available with rate limits (5 requests/second).
- **MusicBrainz API**: Free but requires 1 request/second rate limiting.

## Troubleshooting

### Sorting not working?
1. Check that `OPENAI_API_KEY` is set correctly
2. Verify the database migration has been run
3. Check server logs for errors

### Missing metadata?
- Ensure `LASTFM_API_KEY` is set for Last.fm data
- Spotify tracks require the user to have Spotify connected
- Some songs may not have metadata available from any source

### Rate limiting issues?
- Last.fm: 5 requests/second limit
- MusicBrainz: 1 request/second limit (built-in delays in code)
- The system includes automatic rate limiting and delays

