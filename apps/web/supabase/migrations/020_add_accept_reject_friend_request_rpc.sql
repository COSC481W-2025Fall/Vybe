-- Migration: Add RPC to accept/reject friend requests with SECURITY DEFINER
-- Purpose: Prevent RLS/permission issues and ensure atomic validation + update
-- Date: 2025-12-01

-- Drop if exists to allow idempotent re-runs
DROP FUNCTION IF EXISTS update_friend_request(UUID, UUID, TEXT);

-- Create function
CREATE OR REPLACE FUNCTION update_friend_request(
  p_user_id UUID,        -- acting user (must be recipient to accept/reject)
  p_friendship_id UUID,  -- friendship id
  p_action TEXT          -- 'accept' | 'reject'
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
  v_user_id UUID;
  v_friend_id UUID;
  v_status TEXT;
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be accept or reject';
  END IF;

  -- Load and validate pending friendship
  SELECT f.user_id, f.friend_id, f.status
  INTO v_user_id, v_friend_id, v_status
  FROM public.friendships f
  WHERE f.id = p_friendship_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Friend request already processed';
  END IF;

  -- Only the recipient can accept/reject
  IF v_friend_id <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE public.friendships
    SET status = 'accepted',
        updated_at = NOW()
    WHERE id = p_friendship_id;
  ELSIF p_action = 'reject' THEN
    DELETE FROM public.friendships
    WHERE id = p_friendship_id;
  END IF;

  -- Return the resulting row (for accept) or minimal info (for reject)
  RETURN QUERY
  SELECT 
    f.id AS friendship_id,
    f.user_id AS friendship_user_id,
    f.friend_id AS friendship_friend_id,
    f.status AS friendship_status,
    f.created_at AS friendship_created_at,
    f.updated_at AS friendship_updated_at
  FROM public.friendships f
  WHERE f.id = p_friendship_id;
END;
$$;

-- Ensure owner is postgres for SECURITY DEFINER to bypass RLS
ALTER FUNCTION update_friend_request(UUID, UUID, TEXT) OWNER TO postgres;

-- Allow execution by authenticated/anon (route checks auth)
GRANT EXECUTE ON FUNCTION update_friend_request(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_friend_request(UUID, UUID, TEXT) TO anon;


