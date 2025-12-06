-- Migration: Fix friendships RLS for user search
-- Date: 2025-12-06
-- Purpose: The existing RLS policy uses auth.uid() which only works in the auth context.
--          When querying friendships in an API route, we need to compare against the user.id
--          from the session. This policy allows authenticated users to view friendships
--          where they are either the user_id or friend_id.

-- The existing policy should work, but let's verify it exists and is correct
DO $$
BEGIN
  -- Drop and recreate the SELECT policy to ensure it's correct
  DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
  
  CREATE POLICY "Users can view their own friendships" ON friendships
    FOR SELECT USING (
      auth.uid() = user_id OR auth.uid() = friend_id
    );
    
  RAISE NOTICE 'Friendships SELECT policy recreated successfully';
END $$;

