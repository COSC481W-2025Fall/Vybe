-- Migration: Allow viewing songs of the day on public profiles
-- Date: 2025-12-06
-- Purpose: Add RLS policy to allow authenticated users to view any user's song of the day
--          This enables the public profile page to show song of the day regardless of friendship

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Anyone can view songs on public profiles" ON songs_of_the_day;

-- Create policy allowing any authenticated user to view songs
-- This is safe because profiles are public and song of the day is meant to be shared
CREATE POLICY "Anyone can view songs on public profiles" ON songs_of_the_day
  FOR SELECT
  USING (
    -- Any authenticated user can view any song of the day
    auth.uid() IS NOT NULL
  );

-- Note: This policy works alongside existing policies. 
-- PostgreSQL RLS uses OR logic - if ANY policy passes, access is granted.

