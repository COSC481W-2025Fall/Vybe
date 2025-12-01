-- Create an RPC function to create user profiles (bypasses RLS)
-- This is used when the trigger fails or when creating profiles via API

CREATE OR REPLACE FUNCTION create_user_profile_manual(
  p_user_id UUID,
  p_username TEXT,
  p_display_name TEXT,
  p_profile_picture_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  INSERT INTO public.users (id, username, display_name, profile_picture_url)
  VALUES (p_user_id, p_username, p_display_name, p_profile_picture_url)
  ON CONFLICT (id) DO UPDATE
  SET 
    username = COALESCE(EXCLUDED.username, users.username),
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
    updated_at = NOW()
  RETURNING * INTO v_profile;
  
  -- Return the created/updated profile
  RETURN QUERY
  SELECT 
    v_profile.id,
    v_profile.username,
    v_profile.display_name,
    v_profile.bio,
    v_profile.profile_picture_url,
    COALESCE(v_profile.is_public, false) as is_public,
    v_profile.created_at,
    v_profile.updated_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile_manual TO authenticated;
