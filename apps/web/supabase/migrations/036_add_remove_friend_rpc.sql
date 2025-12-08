-- Migration: Add RPC function to remove friends
-- Purpose: Properly delete friendships with clear success/failure status
-- Date: 2025-12-08

-- Drop if exists
DROP FUNCTION IF EXISTS remove_friend(UUID, UUID);

-- Create function to remove a friend
CREATE OR REPLACE FUNCTION remove_friend(
  p_user_id UUID,    -- the user removing the friend
  p_friend_id UUID   -- the friend being removed
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete friendship in either direction
  DELETE FROM public.friendships
  WHERE (user_id = p_user_id AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = p_user_id);
  
  -- Get the number of rows deleted
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RETURN json_build_object(
      'success', true,
      'deleted_count', v_deleted_count
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Friendship not found'
    );
  END IF;
END;
$$;

-- Ensure owner is postgres for SECURITY DEFINER to bypass RLS
ALTER FUNCTION remove_friend(UUID, UUID) OWNER TO postgres;

-- Allow execution by authenticated users
GRANT EXECUTE ON FUNCTION remove_friend(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_friend(UUID, UUID) TO anon;
