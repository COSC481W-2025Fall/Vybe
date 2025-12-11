-- Enhance Global Song Cache for Cross-Platform Lookups
-- This migration adds indexes and functions to support efficient cross-platform
-- song ID lookups during exports, reducing API calls by caching mappings globally.
-- When User A exports a playlist, any song mappings found benefit ALL users.

-- Add indexes for faster cross-platform lookups during exports
CREATE INDEX IF NOT EXISTS idx_global_songs_title_artist_lower 
  ON global_songs (LOWER(canonical_title), LOWER(canonical_artist));

CREATE INDEX IF NOT EXISTS idx_global_songs_parsed_lower
  ON global_songs (LOWER(parsed_title), LOWER(parsed_artist));

-- Track which search queries led to successful matches (for smarter fuzzy matching)
ALTER TABLE song_aliases ADD COLUMN IF NOT EXISTS search_success_count INTEGER DEFAULT 1;
ALTER TABLE song_aliases ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique constraint for alias upserts (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'song_aliases_unique_lookup'
  ) THEN
    -- Create a unique index for upsert operations
    CREATE UNIQUE INDEX song_aliases_unique_lookup 
      ON song_aliases (global_song_id, LOWER(alias_title), LOWER(COALESCE(alias_artist, '')));
  END IF;
END $$;

-- Function to find cached platform ID (used during exports)
-- This is the main lookup function - checks global_songs first, then aliases
CREATE OR REPLACE FUNCTION find_cached_platform_id(
  p_title TEXT,
  p_artist TEXT,
  p_target_platform TEXT  -- 'spotify' or 'youtube'
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
  v_search_title TEXT;
  v_search_artist TEXT;
BEGIN
  -- Normalize search terms
  v_search_title := LOWER(TRIM(COALESCE(p_title, '')));
  v_search_artist := LOWER(TRIM(COALESCE(p_artist, '')));
  
  -- Return early if no title provided
  IF v_search_title = '' THEN
    RETURN NULL;
  END IF;

  -- Try exact match on canonical title/artist
  IF p_target_platform = 'spotify' THEN
    SELECT spotify_id INTO v_result FROM global_songs 
    WHERE LOWER(canonical_title) = v_search_title
      AND (v_search_artist = '' OR LOWER(COALESCE(canonical_artist, '')) = v_search_artist)
      AND spotify_id IS NOT NULL
    ORDER BY metadata_quality_score DESC, lookup_count DESC
    LIMIT 1;
  ELSE
    SELECT youtube_id INTO v_result FROM global_songs 
    WHERE LOWER(canonical_title) = v_search_title
      AND (v_search_artist = '' OR LOWER(COALESCE(canonical_artist, '')) = v_search_artist)
      AND youtube_id IS NOT NULL
    ORDER BY metadata_quality_score DESC, lookup_count DESC
    LIMIT 1;
  END IF;
  
  IF v_result IS NOT NULL THEN 
    -- Increment lookup count for analytics
    UPDATE global_songs SET lookup_count = lookup_count + 1 
    WHERE (p_target_platform = 'spotify' AND spotify_id = v_result)
       OR (p_target_platform = 'youtube' AND youtube_id = v_result);
    RETURN v_result; 
  END IF;
  
  -- Try parsed title/artist
  IF p_target_platform = 'spotify' THEN
    SELECT spotify_id INTO v_result FROM global_songs 
    WHERE LOWER(parsed_title) = v_search_title
      AND (v_search_artist = '' OR LOWER(COALESCE(parsed_artist, '')) = v_search_artist)
      AND spotify_id IS NOT NULL
    ORDER BY metadata_quality_score DESC, lookup_count DESC
    LIMIT 1;
  ELSE
    SELECT youtube_id INTO v_result FROM global_songs 
    WHERE LOWER(parsed_title) = v_search_title
      AND (v_search_artist = '' OR LOWER(COALESCE(parsed_artist, '')) = v_search_artist)
      AND youtube_id IS NOT NULL
    ORDER BY metadata_quality_score DESC, lookup_count DESC
    LIMIT 1;
  END IF;
  
  IF v_result IS NOT NULL THEN 
    UPDATE global_songs SET lookup_count = lookup_count + 1 
    WHERE (p_target_platform = 'spotify' AND spotify_id = v_result)
       OR (p_target_platform = 'youtube' AND youtube_id = v_result);
    RETURN v_result; 
  END IF;
  
  -- Try alias lookup (previous successful searches)
  SELECT 
    CASE WHEN p_target_platform = 'spotify' THEN gs.spotify_id ELSE gs.youtube_id END
  INTO v_result
  FROM song_aliases sa
  JOIN global_songs gs ON sa.global_song_id = gs.id
  WHERE LOWER(sa.alias_title) = v_search_title
    AND (v_search_artist = '' OR sa.alias_artist IS NULL OR LOWER(sa.alias_artist) = v_search_artist)
    AND CASE WHEN p_target_platform = 'spotify' THEN gs.spotify_id IS NOT NULL ELSE gs.youtube_id IS NOT NULL END
  ORDER BY sa.search_success_count DESC, sa.last_used_at DESC
  LIMIT 1;
  
  IF v_result IS NOT NULL THEN
    -- Update alias usage stats
    UPDATE song_aliases SET 
      search_success_count = search_success_count + 1,
      last_used_at = NOW()
    WHERE LOWER(alias_title) = v_search_title
      AND (v_search_artist = '' OR alias_artist IS NULL OR LOWER(alias_artist) = v_search_artist);
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to cache a successful search result (called after finding a song via API)
-- This stores the mapping globally so future users benefit from this search
CREATE OR REPLACE FUNCTION cache_platform_search_result(
  p_title TEXT,
  p_artist TEXT,
  p_platform_id TEXT,
  p_platform TEXT  -- 'spotify' or 'youtube'
) RETURNS UUID AS $$
DECLARE
  v_song_id UUID;
  v_search_title TEXT;
  v_search_artist TEXT;
BEGIN
  -- Normalize
  v_search_title := TRIM(COALESCE(p_title, ''));
  v_search_artist := TRIM(COALESCE(p_artist, ''));
  
  -- Return early if no platform ID
  IF p_platform_id IS NULL OR p_platform_id = '' THEN
    RETURN NULL;
  END IF;

  -- Find existing song by platform ID
  IF p_platform = 'spotify' THEN
    SELECT id INTO v_song_id FROM global_songs WHERE spotify_id = p_platform_id;
  ELSE
    SELECT id INTO v_song_id FROM global_songs WHERE youtube_id = p_platform_id;
  END IF;
  
  IF v_song_id IS NULL THEN
    -- Try to find by title/artist match that has other platform ID
    SELECT id INTO v_song_id FROM global_songs 
    WHERE LOWER(canonical_title) = LOWER(v_search_title)
      AND (v_search_artist = '' OR LOWER(COALESCE(canonical_artist, '')) = LOWER(v_search_artist))
    LIMIT 1;
  END IF;
  
  IF v_song_id IS NULL THEN
    -- Create new entry
    INSERT INTO global_songs (
      original_title, original_artist,
      parsed_title, parsed_artist,
      canonical_title, canonical_artist,
      spotify_id, youtube_id,
      metadata_sources,
      metadata_quality_score
    ) VALUES (
      v_search_title, NULLIF(v_search_artist, ''),
      v_search_title, NULLIF(v_search_artist, ''),
      v_search_title, NULLIF(v_search_artist, ''),
      CASE WHEN p_platform = 'spotify' THEN p_platform_id ELSE NULL END,
      CASE WHEN p_platform = 'youtube' THEN p_platform_id ELSE NULL END,
      ARRAY[p_platform],
      CASE WHEN p_platform = 'spotify' THEN 40 ELSE 20 END  -- Spotify IDs are more reliable
    ) RETURNING id INTO v_song_id;
  ELSE
    -- Update existing entry with new platform ID if missing
    IF p_platform = 'spotify' THEN
      UPDATE global_songs SET
        spotify_id = COALESCE(spotify_id, p_platform_id),
        metadata_sources = CASE 
          WHEN p_platform = ANY(metadata_sources) THEN metadata_sources 
          ELSE array_append(metadata_sources, p_platform) 
        END,
        metadata_quality_score = LEAST(100, metadata_quality_score + 20),
        updated_at = NOW()
      WHERE id = v_song_id AND spotify_id IS NULL;
    ELSE
      UPDATE global_songs SET
        youtube_id = COALESCE(youtube_id, p_platform_id),
        metadata_sources = CASE 
          WHEN p_platform = ANY(metadata_sources) THEN metadata_sources 
          ELSE array_append(metadata_sources, p_platform) 
        END,
        metadata_quality_score = LEAST(100, metadata_quality_score + 10),
        updated_at = NOW()
      WHERE id = v_song_id AND youtube_id IS NULL;
    END IF;
  END IF;
  
  -- Add the search query as an alias for future lookups (upsert)
  INSERT INTO song_aliases (
    global_song_id, 
    alias_title, 
    alias_artist, 
    alias_type, 
    search_success_count, 
    last_used_at
  )
  VALUES (
    v_song_id, 
    v_search_title, 
    NULLIF(v_search_artist, ''), 
    'export_search', 
    1, 
    NOW()
  )
  ON CONFLICT (global_song_id, LOWER(alias_title), LOWER(COALESCE(alias_artist, ''))) 
  DO UPDATE SET 
    search_success_count = song_aliases.search_success_count + 1, 
    last_used_at = NOW();
  
  RETURN v_song_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_cached_platform_id TO authenticated;
GRANT EXECUTE ON FUNCTION find_cached_platform_id TO service_role;
GRANT EXECUTE ON FUNCTION cache_platform_search_result TO authenticated;
GRANT EXECUTE ON FUNCTION cache_platform_search_result TO service_role;

-- Comments
COMMENT ON FUNCTION find_cached_platform_id IS 'Find cached Spotify/YouTube ID from global song database. Returns NULL if not found.';
COMMENT ON FUNCTION cache_platform_search_result IS 'Cache a successful API search result for future lookups by all users.';
