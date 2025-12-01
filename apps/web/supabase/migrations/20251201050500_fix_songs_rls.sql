-- Migration: Fix RLS policy for songs_of_the_day to allow friends to view
-- Date: 2025-12-01
-- Purpose: Replace existing SELECT policies with a single, correct policy
--          that allows users to view their own rows OR friends' rows
--          when the friendship status is 'accepted' in either direction.

-- Ensure table exists and RLS is enabled (safe if already set)
ALTER TABLE songs_of_the_day ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies related to viewing (idempotent)
DROP POLICY IF EXISTS "Users can view friends songs of the day" ON songs_of_the_day;
DROP POLICY IF EXISTS "Users can view their own songs of the day" ON songs_of_the_day;

-- Create a consolidated SELECT policy that covers both self and friends
CREATE POLICY "Friends can view songs of the day" ON songs_of_the_day
  FOR SELECT
  USING (
    -- Allow user to read their own row
    auth.uid() = user_id
    OR
    -- Allow if the song owner is a confirmed friend (either direction)
    EXISTS (
      SELECT 1
      FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = songs_of_the_day.user_id)
        OR
        (friendships.friend_id = auth.uid() AND friendships.user_id = songs_of_the_day.user_id)
      )
      AND friendships.status = 'accepted'
    )
  );

-- Notes:
-- - This policy keeps INSERT/UPDATE/DELETE policies unchanged.
-- - If further restrictions are needed (e.g., privacy settings), they can be incorporated later.


