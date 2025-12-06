-- ============================================================================
-- Migration: Fix get_friends_of_user_songs to include image_url
-- Purpose: Add image_url to the returned columns for song thumbnails
-- Date: 2025-12-06
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_friends_of_user_songs(UUID);

-- Recreate with image_url included
CREATE OR REPLACE FUNCTION get_friends_of_user_songs(current_user_id UUID)
RETURNS TABLE (
  song_id UUID,
  song_user_id UUID,
  song_name TEXT,
  artist TEXT,
  album TEXT,
  image_url TEXT,
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
    s.image_url,
    s.spotify_url,
    s.youtube_url,
    s.created_at,
    u.username::TEXT AS friend_username,
    u.display_name::TEXT AS friend_display_name,
    u.profile_picture_url::TEXT AS friend_profile_picture_url
  FROM songs_of_the_day s
  INNER JOIN friendships f
    ON (f.user_id = current_user_id AND f.friend_id = s.user_id)
    OR (f.friend_id = current_user_id AND f.user_id = s.user_id)
  INNER JOIN users u ON u.id = s.user_id
  WHERE f.status = 'accepted'
    AND s.created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
    AND s.user_id != current_user_id
  ORDER BY s.created_at DESC;
END;
$$;

-- Set ownership and permissions
ALTER FUNCTION get_friends_of_user_songs(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION get_friends_of_user_songs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_of_user_songs(UUID) TO anon;

