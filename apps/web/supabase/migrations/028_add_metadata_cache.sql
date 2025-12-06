-- Add metadata cache columns to playlist_songs table
-- This enables persistent caching of genre, popularity, and audio features
-- reducing API calls and improving sort quality over time

-- Add metadata cache columns
ALTER TABLE playlist_songs
ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS audio_features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata_source TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS metadata_fetched_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_title TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parsed_artist TEXT DEFAULT NULL;

-- Add index for songs that need metadata fetching
CREATE INDEX IF NOT EXISTS idx_playlist_songs_needs_metadata 
ON playlist_songs (metadata_fetched_at) 
WHERE metadata_fetched_at IS NULL;

-- Add index for genre-based queries (useful for sorting)
CREATE INDEX IF NOT EXISTS idx_playlist_songs_genres 
ON playlist_songs USING GIN (genres);

-- Add index for popularity-based queries
CREATE INDEX IF NOT EXISTS idx_playlist_songs_popularity 
ON playlist_songs (popularity DESC);

-- Create a function to check if metadata needs refresh (older than 30 days)
CREATE OR REPLACE FUNCTION metadata_needs_refresh(fetched_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN fetched_at IS NULL OR fetched_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for songs needing metadata
CREATE OR REPLACE VIEW songs_needing_metadata AS
SELECT 
  ps.id,
  ps.title,
  ps.artist,
  ps.external_id,
  gp.platform,
  ps.playlist_id,
  ps.metadata_fetched_at
FROM playlist_songs ps
JOIN group_playlists gp ON ps.playlist_id = gp.id
WHERE metadata_needs_refresh(ps.metadata_fetched_at)
ORDER BY ps.created_at DESC
LIMIT 100;

-- Grant access to the view
GRANT SELECT ON songs_needing_metadata TO authenticated;

COMMENT ON COLUMN playlist_songs.genres IS 'Cached genres from Last.fm/Spotify/MusicBrainz';
COMMENT ON COLUMN playlist_songs.popularity IS 'Cached popularity score (0-100 for Spotify, play count for Last.fm)';
COMMENT ON COLUMN playlist_songs.audio_features IS 'Cached audio features from Spotify (danceability, energy, etc.)';
COMMENT ON COLUMN playlist_songs.metadata_source IS 'Source of the cached metadata (spotify, lastfm, musicbrainz)';
COMMENT ON COLUMN playlist_songs.metadata_fetched_at IS 'When metadata was last fetched';
COMMENT ON COLUMN playlist_songs.parsed_title IS 'Cleaned/parsed title extracted from YouTube titles';
COMMENT ON COLUMN playlist_songs.parsed_artist IS 'Cleaned/parsed artist extracted from YouTube titles';

