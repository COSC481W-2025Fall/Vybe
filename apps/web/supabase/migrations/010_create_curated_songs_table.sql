-- Create curated_songs table for managing song curation in communities
-- This migration is safe to run multiple times (idempotent)

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS curated_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  playlist_link_index INTEGER NOT NULL, -- Index of the playlist link in the community's playlist_links array
  song_id TEXT NOT NULL, -- Song ID from Spotify/YouTube
  song_title TEXT NOT NULL,
  song_artist TEXT,
  song_thumbnail TEXT,
  song_duration INTEGER, -- Duration in seconds
  platform TEXT NOT NULL CHECK (platform IN ('spotify', 'youtube')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed')),
  removal_reason TEXT, -- Optional reason for removal (e.g., 'vulgar', 'explicit', etc.)
  curated_by UUID REFERENCES auth.users(id),
  curated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique song per community playlist link
  CONSTRAINT unique_song_per_playlist UNIQUE (community_id, playlist_link_index, song_id)
);

-- Create indexes for faster lookups (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_curated_songs_community_id ON curated_songs(community_id);
CREATE INDEX IF NOT EXISTS idx_curated_songs_status ON curated_songs(status);
CREATE INDEX IF NOT EXISTS idx_curated_songs_community_status ON curated_songs(community_id, status);

-- Enable Row Level Security (safe - won't error if already enabled)
DO $$
BEGIN
  ALTER TABLE curated_songs ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS might already be enabled, which is fine
    NULL;
END $$;

-- Drop existing policies if they exist (safe - will recreate them)
DROP POLICY IF EXISTS "Anyone can view curated songs" ON curated_songs;
DROP POLICY IF EXISTS "Authenticated users can manage curated songs" ON curated_songs;

-- Policies for curated_songs table
-- Anyone can view curated songs (for displaying in communities)
CREATE POLICY "Anyone can view curated songs" ON curated_songs
  FOR SELECT USING (true);

-- Only authenticated users can manage curated songs (admin check in API)
CREATE POLICY "Authenticated users can manage curated songs" ON curated_songs
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp (safe to replace)
CREATE OR REPLACE FUNCTION update_curated_songs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at (safe - drops existing if present)
DROP TRIGGER IF EXISTS update_curated_songs_updated_at ON curated_songs;
CREATE TRIGGER update_curated_songs_updated_at
  BEFORE UPDATE ON curated_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_curated_songs_updated_at();

