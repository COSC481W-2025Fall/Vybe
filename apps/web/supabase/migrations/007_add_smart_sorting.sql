-- Add smart sorting columns to group_playlists and playlist_songs tables
-- This enables AI-powered ordering of playlists and songs based on genres, artists, and popularity

-- Add smart_sorted_order to group_playlists table
ALTER TABLE group_playlists 
ADD COLUMN IF NOT EXISTS smart_sorted_order INTEGER,
ADD COLUMN IF NOT EXISTS last_sorted_at TIMESTAMPTZ;

-- Add smart_sorted_order to playlist_songs table
ALTER TABLE playlist_songs 
ADD COLUMN IF NOT EXISTS smart_sorted_order INTEGER;

-- Create indexes for efficient sorting queries
CREATE INDEX IF NOT EXISTS idx_group_playlists_smart_order ON group_playlists(group_id, smart_sorted_order) WHERE smart_sorted_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playlist_songs_smart_order ON playlist_songs(playlist_id, smart_sorted_order) WHERE smart_sorted_order IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN group_playlists.smart_sorted_order IS 'AI-generated order for playlists within a group (lower numbers appear first)';
COMMENT ON COLUMN group_playlists.last_sorted_at IS 'Timestamp when smart sorting was last applied to this group';
COMMENT ON COLUMN playlist_songs.smart_sorted_order IS 'AI-generated order for songs within a playlist (lower numbers appear first)';

