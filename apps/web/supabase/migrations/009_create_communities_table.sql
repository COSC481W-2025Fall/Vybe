-- Create communities table for managing music communities
-- This migration is safe to run multiple times (idempotent)

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER DEFAULT 0,
  group_count INTEGER DEFAULT 0,
  playlist_links JSONB DEFAULT '[]'::jsonb, -- Array of playlist link objects: [{platform: 'spotify'|'youtube', url: string, label?: string}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT communities_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Create indexes for faster lookups (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_communities_name ON communities(name);
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at DESC);

-- Enable Row Level Security (safe - won't error if already enabled)
DO $$
BEGIN
  ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS might already be enabled, which is fine
    NULL;
END $$;

-- Drop existing policies if they exist (safe - will recreate them)
DROP POLICY IF EXISTS "Anyone can view communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can manage communities" ON communities;

-- Create policies for communities table
-- Everyone can view communities
CREATE POLICY "Anyone can view communities" ON communities
  FOR SELECT USING (true);

-- Only admins can insert/update/delete (we'll check admin status in the API)
-- For now, we'll allow authenticated users to manage, but you can restrict this further
CREATE POLICY "Authenticated users can manage communities" ON communities
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp (safe to replace)
CREATE OR REPLACE FUNCTION update_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at (safe - drops existing if present)
DROP TRIGGER IF EXISTS update_communities_updated_at ON communities;
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_communities_updated_at();

