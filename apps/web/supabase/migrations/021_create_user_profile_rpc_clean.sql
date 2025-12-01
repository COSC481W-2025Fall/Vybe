-- Clean RPC function for user profile creation/update
-- This replaces all previous versions and ensures display_name is NEVER overwritten

-- Drop all old versions
DROP FUNCTION IF EXISTS create_user_profile_manual(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_profile_manual(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- Create a simple, clean function
CREATE OR REPLACE FUNCTION create_user_profile_manual(
  p_user_id UUID,
  p_username TEXT,
  p_display_name TEXT,
  p_profile_picture_url TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT false
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
  v_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE public.users.id = p_user_id)
  INTO v_exists;
  
  IF v_exists THEN
    -- Profile exists - update other fields but NEVER touch display_name if it has a value
    -- Use a subquery to check display_name to avoid ambiguity
    UPDATE public.users u
    SET 
      username = COALESCE(NULLIF(p_username, ''), u.username),
      -- CRITICAL: Only update display_name if current is NULL or empty string
      display_name = CASE 
        WHEN u.display_name IS NULL OR u.display_name = '' 
        THEN COALESCE(NULLIF(p_display_name, ''), u.display_name)
        ELSE u.display_name  -- NEVER overwrite existing display_name
      END,
      profile_picture_url = COALESCE(NULLIF(p_profile_picture_url, ''), u.profile_picture_url),
      bio = COALESCE(NULLIF(p_bio, ''), u.bio),
      is_public = COALESCE(p_is_public, u.is_public),
      updated_at = NOW()
    WHERE u.id = p_user_id;
  ELSE
    -- Profile doesn't exist - create it
    INSERT INTO public.users (
      id, 
      username, 
      display_name, 
      profile_picture_url, 
      bio, 
      is_public
    )
    VALUES (
      p_user_id,
      p_username,
      p_display_name,
      p_profile_picture_url,
      p_bio,
      COALESCE(p_is_public, false)
    );
  END IF;
  
  -- Return the profile
  RETURN QUERY
  SELECT 
    u.id::UUID,
    u.username::TEXT,
    u.display_name::TEXT,
    u.bio::TEXT,
    u.profile_picture_url::TEXT,
    COALESCE(u.is_public, false)::BOOLEAN,
    u.created_at::TIMESTAMPTZ,
    u.updated_at::TIMESTAMPTZ
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;

-- Set ownership and permissions
ALTER FUNCTION create_user_profile_manual(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
