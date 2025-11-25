-- Fix RLS policies for spotify_tokens table
-- This migration ensures users can save their own Spotify tokens

-- First, ensure the spotify_tokens table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS spotify_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own spotify tokens" ON spotify_tokens;
DROP POLICY IF EXISTS "Users can update their own spotify tokens" ON spotify_tokens;
DROP POLICY IF EXISTS "Users can read their own spotify tokens" ON spotify_tokens;
DROP POLICY IF EXISTS "Users can delete their own spotify tokens" ON spotify_tokens;

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own spotify tokens"
ON spotify_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update their own spotify tokens"
ON spotify_tokens
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read their own tokens
CREATE POLICY "Users can read their own spotify tokens"
ON spotify_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete their own spotify tokens"
ON spotify_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Also fix the users table updated_at column issue
-- Check if updated_at column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to users table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in users table';
  END IF;
END $$;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

