-- ============================================================================
-- SECURITY DEFINER RPC: get_friends_of_user_songs
-- Purpose: Return today's songs of the day for accepted friends of a user
-- Bypasses RLS safely via SECURITY DEFINER
-- Date: 2025-12-01
-- ============================================================================

-- Drop existing function if it exists (idempotent)
DROP FUNCTION IF EXISTS get_friends_of_user_songs(UUID);

CREATE OR REPLACE FUNCTION get_friends_of_user_songs(current_user_id UUID)
RETURNS TABLE (
  song_id UUID,
  song_user_id UUID,
  song_name TEXT,
  artist TEXT,
  album TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ,
  friend_username TEXT,
  friend_display_name TEXT,
  friend_profile_picture_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS song_id,
    s.user_id AS song_user_id,
    s.song_name,
    s.artist,
    s.album,
    s.spotify_url,
    s.youtube_url,
    s.created_at,
    u.username::TEXT AS friend_username,
    u.display_name::TEXT AS friend_display_name,
    u.profile_picture_url::TEXT AS friend_profile_picture_url
  FROM songs_of_the_day s
  JOIN users u
    ON u.id = s.user_id
  JOIN friendships f
    ON (
      (f.user_id = current_user_id AND f.friend_id = s.user_id)
      OR
      (f.friend_id = current_user_id AND f.user_id = s.user_id)
    )
  WHERE f.status = 'accepted'
    AND s.created_at >= CURRENT_DATE; -- only today's songs
END;
$$;

-- Ensure owner is postgres for SECURITY DEFINER
ALTER FUNCTION get_friends_of_user_songs(UUID) OWNER TO postgres;

-- Grant execute to web roles
GRANT EXECUTE ON FUNCTION get_friends_of_user_songs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_of_user_songs(UUID) TO anon;


