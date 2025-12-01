-- ============================================================================
-- FIX FRIENDSHIPS RLS - Create RPC function to bypass RLS for friend requests
-- ============================================================================
-- This function uses SECURITY DEFINER to run with postgres privileges,
-- which bypasses RLS policies on the friendships table.
-- RLS should remain ENABLED on the friendships table for security.

-- Drop existing function if it exists (in case of signature changes)
DROP FUNCTION IF EXISTS create_friend_request(UUID, UUID);

-- Create an RPC function to create friend requests with SECURITY DEFINER
-- SECURITY DEFINER means this function runs with the privileges of the function owner (postgres),
-- which bypasses RLS checks. This allows the function to INSERT into friendships
-- even when the calling user doesn't have direct INSERT permissions.
CREATE OR REPLACE FUNCTION create_friend_request(
  p_user_id UUID,
  p_friend_id UUID
)
RETURNS TABLE (
  friendship_id UUID,
  friendship_user_id UUID,
  friendship_friend_id UUID,
  friendship_status TEXT,
  friendship_created_at TIMESTAMPTZ,
  friendship_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friendship_id UUID;
BEGIN
  -- Check if friendship already exists
  -- This SELECT runs with postgres privileges, so it bypasses RLS
  IF EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user_id = p_user_id AND f.friend_id = p_friend_id)
       OR (f.user_id = p_friend_id AND f.friend_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Friendship already exists';
  END IF;
  
  -- Check if user is trying to friend themselves
  IF p_user_id = p_friend_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;
  
  -- Insert the friend request
  -- This INSERT runs with postgres privileges, so it bypasses RLS
  INSERT INTO public.friendships (user_id, friend_id, status)
  VALUES (p_user_id, p_friend_id, 'pending')
  RETURNING id INTO v_friendship_id;
  
  -- Return the created friendship with renamed columns to avoid ambiguity
  -- This SELECT runs with postgres privileges, so it bypasses RLS
  RETURN QUERY
  SELECT 
    f.id AS friendship_id,
    f.user_id AS friendship_user_id,
    f.friend_id AS friendship_friend_id,
    f.status AS friendship_status,
    f.created_at AS friendship_created_at,
    f.updated_at AS friendship_updated_at
  FROM public.friendships f
  WHERE f.id = v_friendship_id;
END;
$$;

-- Set ownership to postgres (required for SECURITY DEFINER to bypass RLS)
ALTER FUNCTION create_friend_request(UUID, UUID) OWNER TO postgres;

-- Grant execute to authenticated users and anon
-- This allows API routes (which run as authenticated users) to call the function
GRANT EXECUTE ON FUNCTION create_friend_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_friend_request(UUID, UUID) TO anon;

-- Ensure RLS is enabled on friendships table (required for security)
-- The function bypasses RLS, but RLS should still be enabled on the table
-- to protect against direct table access
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled on friendships table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'friendships'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Failed to enable RLS on friendships table!';
  END IF;
END $$;
