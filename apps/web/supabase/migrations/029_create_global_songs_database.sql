-- Global Songs Database
-- A shared knowledge base of song metadata that grows as users interact with the app
-- Songs are identified by a combination of title/artist and platform IDs

-- Create the global songs table
CREATE TABLE IF NOT EXISTS global_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original identifiers (how the song was first found)
  original_title TEXT NOT NULL,
  original_artist TEXT,
  
  -- Parsed/cleaned identifiers (for better matching)
  parsed_title TEXT,
  parsed_artist TEXT,
  
  -- Canonical identifiers (verified/best version)
  canonical_title TEXT,
  canonical_artist TEXT,
  album TEXT,
  
  -- Platform-specific IDs
  spotify_id TEXT UNIQUE,
  youtube_id TEXT,
  
  -- Metadata
  genres TEXT[] DEFAULT '{}',
  popularity INTEGER DEFAULT 0,
  audio_features JSONB DEFAULT '{}',
  duration_ms INTEGER,
  release_date DATE,
  explicit BOOLEAN DEFAULT false,
  
  -- Source tracking
  metadata_sources TEXT[] DEFAULT '{}',
  metadata_quality_score INTEGER DEFAULT 0, -- 0-100, higher is better
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  
  -- Statistics
  lookup_count INTEGER DEFAULT 1,
  used_in_sorts INTEGER DEFAULT 0
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_global_songs_spotify_id ON global_songs (spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_global_songs_youtube_id ON global_songs (youtube_id) WHERE youtube_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_global_songs_canonical ON global_songs (canonical_artist, canonical_title);
CREATE INDEX IF NOT EXISTS idx_global_songs_parsed ON global_songs (parsed_artist, parsed_title);
CREATE INDEX IF NOT EXISTS idx_global_songs_original ON global_songs (original_artist, original_title);
CREATE INDEX IF NOT EXISTS idx_global_songs_genres ON global_songs USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_global_songs_popularity ON global_songs (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_global_songs_quality ON global_songs (metadata_quality_score DESC);

-- Create a lookup table for alternative titles/spellings
CREATE TABLE IF NOT EXISTS song_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_song_id UUID NOT NULL REFERENCES global_songs(id) ON DELETE CASCADE,
  alias_title TEXT NOT NULL,
  alias_artist TEXT,
  alias_type TEXT DEFAULT 'user_input', -- 'user_input', 'youtube_title', 'spotify_search', 'ai_parsed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_song_aliases_lookup ON song_aliases (alias_artist, alias_title);
CREATE INDEX IF NOT EXISTS idx_song_aliases_title ON song_aliases (alias_title);
CREATE INDEX IF NOT EXISTS idx_song_aliases_song_id ON song_aliases (global_song_id);

-- Create a user songs cache table (for quick access to user's playlists/history)
CREATE TABLE IF NOT EXISTS user_song_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  global_song_id UUID REFERENCES global_songs(id) ON DELETE SET NULL,
  
  -- Original data from user's platform
  platform TEXT NOT NULL, -- 'spotify', 'youtube'
  platform_id TEXT NOT NULL, -- Spotify track ID or YouTube video ID
  original_title TEXT NOT NULL,
  original_artist TEXT,
  
  -- Source of the song
  source_type TEXT NOT NULL, -- 'playlist', 'recent_play', 'liked', 'group'
  source_id TEXT, -- Playlist ID, group ID, etc.
  source_name TEXT, -- Playlist name, group name, etc.
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per user/platform/song
  UNIQUE(user_id, platform, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_user_song_cache_user ON user_song_cache (user_id);
CREATE INDEX IF NOT EXISTS idx_user_song_cache_platform ON user_song_cache (platform, platform_id);
CREATE INDEX IF NOT EXISTS idx_user_song_cache_global ON user_song_cache (global_song_id) WHERE global_song_id IS NOT NULL;

-- Function to find or create a global song entry
CREATE OR REPLACE FUNCTION find_or_create_global_song(
  p_original_title TEXT,
  p_original_artist TEXT,
  p_parsed_title TEXT DEFAULT NULL,
  p_parsed_artist TEXT DEFAULT NULL,
  p_spotify_id TEXT DEFAULT NULL,
  p_youtube_id TEXT DEFAULT NULL,
  p_genres TEXT[] DEFAULT '{}',
  p_popularity INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_song_id UUID;
  v_search_title TEXT;
  v_search_artist TEXT;
BEGIN
  -- Use parsed values if available, otherwise original
  v_search_title := LOWER(TRIM(COALESCE(p_parsed_title, p_original_title)));
  v_search_artist := LOWER(TRIM(COALESCE(p_parsed_artist, p_original_artist, '')));
  
  -- Try to find by Spotify ID first (most reliable)
  IF p_spotify_id IS NOT NULL THEN
    SELECT id INTO v_song_id FROM global_songs WHERE spotify_id = p_spotify_id;
    IF v_song_id IS NOT NULL THEN
      -- Update lookup count and potentially add YouTube ID
      UPDATE global_songs SET 
        lookup_count = lookup_count + 1,
        youtube_id = COALESCE(youtube_id, p_youtube_id),
        updated_at = NOW()
      WHERE id = v_song_id;
      RETURN v_song_id;
    END IF;
  END IF;
  
  -- Try to find by YouTube ID
  IF p_youtube_id IS NOT NULL THEN
    SELECT id INTO v_song_id FROM global_songs WHERE youtube_id = p_youtube_id;
    IF v_song_id IS NOT NULL THEN
      UPDATE global_songs SET 
        lookup_count = lookup_count + 1,
        spotify_id = COALESCE(spotify_id, p_spotify_id),
        updated_at = NOW()
      WHERE id = v_song_id;
      RETURN v_song_id;
    END IF;
  END IF;
  
  -- Try to find by canonical title/artist
  SELECT id INTO v_song_id FROM global_songs 
  WHERE LOWER(canonical_artist) = v_search_artist 
    AND LOWER(canonical_title) = v_search_title;
  IF v_song_id IS NOT NULL THEN
    UPDATE global_songs SET lookup_count = lookup_count + 1, updated_at = NOW() WHERE id = v_song_id;
    RETURN v_song_id;
  END IF;
  
  -- Try to find by parsed title/artist
  SELECT id INTO v_song_id FROM global_songs 
  WHERE LOWER(parsed_artist) = v_search_artist 
    AND LOWER(parsed_title) = v_search_title;
  IF v_song_id IS NOT NULL THEN
    UPDATE global_songs SET lookup_count = lookup_count + 1, updated_at = NOW() WHERE id = v_song_id;
    RETURN v_song_id;
  END IF;
  
  -- Check aliases
  SELECT global_song_id INTO v_song_id FROM song_aliases 
  WHERE LOWER(alias_title) = v_search_title 
    AND (alias_artist IS NULL OR LOWER(alias_artist) = v_search_artist);
  IF v_song_id IS NOT NULL THEN
    UPDATE global_songs SET lookup_count = lookup_count + 1, updated_at = NOW() WHERE id = v_song_id;
    RETURN v_song_id;
  END IF;
  
  -- Not found - create new entry
  INSERT INTO global_songs (
    original_title, original_artist,
    parsed_title, parsed_artist,
    canonical_title, canonical_artist,
    spotify_id, youtube_id,
    genres, popularity
  ) VALUES (
    p_original_title, p_original_artist,
    COALESCE(p_parsed_title, p_original_title), COALESCE(p_parsed_artist, p_original_artist),
    COALESCE(p_parsed_title, p_original_title), COALESCE(p_parsed_artist, p_original_artist),
    p_spotify_id, p_youtube_id,
    p_genres, p_popularity
  ) RETURNING id INTO v_song_id;
  
  -- Also add the original title as an alias
  INSERT INTO song_aliases (global_song_id, alias_title, alias_artist, alias_type)
  VALUES (v_song_id, p_original_title, p_original_artist, 'user_input');
  
  RETURN v_song_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update song metadata
CREATE OR REPLACE FUNCTION update_song_metadata(
  p_song_id UUID,
  p_genres TEXT[] DEFAULT NULL,
  p_popularity INTEGER DEFAULT NULL,
  p_audio_features JSONB DEFAULT NULL,
  p_canonical_title TEXT DEFAULT NULL,
  p_canonical_artist TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'unknown'
) RETURNS VOID AS $$
DECLARE
  v_current_quality INTEGER;
  v_new_quality INTEGER;
BEGIN
  -- Get current quality score
  SELECT metadata_quality_score INTO v_current_quality FROM global_songs WHERE id = p_song_id;
  
  -- Calculate new quality (more sources = higher quality)
  v_new_quality := v_current_quality;
  IF p_genres IS NOT NULL AND array_length(p_genres, 1) > 0 THEN
    v_new_quality := v_new_quality + 20;
  END IF;
  IF p_popularity IS NOT NULL AND p_popularity > 0 THEN
    v_new_quality := v_new_quality + 20;
  END IF;
  IF p_audio_features IS NOT NULL AND p_audio_features != '{}' THEN
    v_new_quality := v_new_quality + 30;
  END IF;
  IF p_canonical_title IS NOT NULL THEN
    v_new_quality := v_new_quality + 15;
  END IF;
  v_new_quality := LEAST(100, v_new_quality);
  
  UPDATE global_songs SET
    genres = COALESCE(p_genres, genres),
    popularity = GREATEST(COALESCE(p_popularity, 0), popularity),
    audio_features = COALESCE(p_audio_features, audio_features),
    canonical_title = COALESCE(p_canonical_title, canonical_title),
    canonical_artist = COALESCE(p_canonical_artist, canonical_artist),
    metadata_sources = array_append(
      CASE WHEN p_source = ANY(metadata_sources) THEN metadata_sources 
      ELSE metadata_sources END, 
      p_source
    ),
    metadata_quality_score = v_new_quality,
    updated_at = NOW(),
    last_verified_at = CASE WHEN p_source IN ('spotify', 'lastfm') THEN NOW() ELSE last_verified_at END
  WHERE id = p_song_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE global_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_song_cache ENABLE ROW LEVEL SECURITY;

-- Policies for global_songs (read-only for all, write via functions)
CREATE POLICY "Anyone can read global songs" ON global_songs FOR SELECT USING (true);
CREATE POLICY "Service role can insert global songs" ON global_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update global songs" ON global_songs FOR UPDATE USING (true);

-- Policies for song_aliases
CREATE POLICY "Anyone can read aliases" ON song_aliases FOR SELECT USING (true);
CREATE POLICY "Service role can manage aliases" ON song_aliases FOR ALL USING (true);

-- Policies for user_song_cache
CREATE POLICY "Users can read own cache" ON user_song_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cache" ON user_song_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cache" ON user_song_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cache" ON user_song_cache FOR DELETE USING (auth.uid() = user_id);

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION find_or_create_global_song TO authenticated;
GRANT EXECUTE ON FUNCTION update_song_metadata TO authenticated;

-- Comments
COMMENT ON TABLE global_songs IS 'Global database of all known songs with metadata, shared across all users';
COMMENT ON TABLE song_aliases IS 'Alternative titles/spellings that map to global songs';
COMMENT ON TABLE user_song_cache IS 'Per-user cache of songs from their playlists and listening history';
COMMENT ON FUNCTION find_or_create_global_song IS 'Find existing song by various identifiers or create new entry';
COMMENT ON FUNCTION update_song_metadata IS 'Update song metadata with quality scoring';

