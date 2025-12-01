-- Update existing communities to use "Our favorites" naming
-- Remove member_count and group_count (set to 0) - communities only track songs
-- This migration is safe to run multiple times (idempotent)

-- Update any communities with generic names to "Our favorites" and reset counts
UPDATE communities
SET 
  name = 'Our favorites',
  description = 'Curated music playlists from our community',
  member_count = 0,
  group_count = 0
WHERE 
  name IN ('Dev-faves', 'dev-faves', 'Dev Faves', 'dev faves', 'Favorites', 'favorites', 'Our favorites', 'our favorites')
  OR name IS NULL
  OR name = '';

-- Reset all existing communities to remove member/group counts (communities only track songs)
UPDATE communities
SET 
  member_count = 0,
  group_count = 0;

-- If no communities exist, you can optionally create a default one:
-- (Uncomment the following if you want a default community)
/*
INSERT INTO communities (name, description, member_count, group_count, playlist_links)
SELECT 
  'Our favorites',
  'Curated music playlists from our community',
  0,
  0,
  '[]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM communities WHERE name = 'Our favorites'
);
*/

