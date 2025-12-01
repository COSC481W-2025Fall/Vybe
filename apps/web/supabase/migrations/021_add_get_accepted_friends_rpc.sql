-- ============================================================================
-- ADD RPC FUNCTION TO FETCH ACCEPTED FRIENDS
-- ============================================================================
-- This function uses SECURITY DEFINER to bypass RLS and reliably fetch
-- all accepted friendships for a given user.
-- 
-- Problem: Direct queries to friendships table may be blocked by RLS
-- Solution: Use SECURITY DEFINER RPC that runs with postgres privileges

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_accepted_friends(UUID);

-- Create RPC function to fetch accepted friends
CREATE OR REPLACE FUNCTION get_accepted_friends(p_user_id UUID)
RETURNS TABLE (
  friendship_id UUID,
  friend_user_id UUID,
  friend_username TEXT,
  friend_display_name TEXT,
  friendship_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return all accepted friendships for this user
  -- Check both directions: user sent the request OR user received the request
  RETURN QUERY
  SELECT 
    f.id AS friendship_id,
    CASE 
      WHEN f.user_id = p_user_id THEN f.friend_id
      ELSE f.user_id
    END AS friend_user_id,
    u.username::TEXT AS friend_username,
    u.display_name::TEXT AS friend_display_name,
    f.created_at AS friendship_created_at
  FROM public.friendships f
  INNER JOIN public.users u ON (
    CASE 
      WHEN f.user_id = p_user_id THEN u.id = f.friend_id
      ELSE u.id = f.user_id
    END
  )
  WHERE f.status = 'accepted'
    AND (f.user_id = p_user_id OR f.friend_id = p_user_id)
  ORDER BY f.created_at DESC;
END;
$$;

-- Set ownership to postgres (required for SECURITY DEFINER to bypass RLS)
ALTER FUNCTION get_accepted_friends(UUID) OWNER TO postgres;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_accepted_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accepted_friends(UUID) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_accepted_friends(UUID) IS 
  'Fetches all accepted friends for a user, bypassing RLS. Returns friend details including username and display_name.';

