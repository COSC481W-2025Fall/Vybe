-- Rebuild profile system from scratch based on actual database schema
-- This migration fixes all profile creation/update issues

-- ============================================================================
-- STEP 1: Drop and recreate the RPC function with proper types
-- ============================================================================

DROP FUNCTION IF EXISTS create_user_profile_manual(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_profile_manual(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

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
  v_current_display_name VARCHAR;
BEGIN
  -- Get current display_name if profile exists
  SELECT u.display_name INTO v_current_display_name
  FROM public.users u
  WHERE u.id = p_user_id
  LIMIT 1;
  
  -- If profile exists
  IF v_current_display_name IS NOT NULL THEN
    -- Profile exists - update fields but NEVER overwrite display_name
    -- Only update display_name if it's empty or matches email pattern (likely a default)
    UPDATE public.users u
    SET 
      username = COALESCE(NULLIF(p_username, ''), u.username),
      -- CRITICAL: Preserve display_name unless it's empty or looks like an email username
      display_name = CASE 
        -- If current is empty, use new value
        WHEN u.display_name = '' OR u.display_name IS NULL
        THEN COALESCE(NULLIF(p_display_name, ''), u.display_name)::VARCHAR
        -- If current looks like email default (no spaces, matches email pattern), allow update
        WHEN u.display_name ~ '^[a-zA-Z0-9._-]+$' AND length(u.display_name) < 30 AND u.display_name NOT LIKE '% %'
        THEN CASE
          -- Only update if new value is provided and different
          WHEN p_display_name IS NOT NULL AND p_display_name != '' AND p_display_name != u.display_name
          THEN p_display_name::VARCHAR
          ELSE u.display_name  -- Keep existing
        END
        -- Otherwise, always preserve (it's a custom name)
        ELSE u.display_name
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
      p_username::VARCHAR,
      COALESCE(NULLIF(p_display_name, ''), p_username)::VARCHAR,
      p_profile_picture_url,
      p_bio,
      COALESCE(p_is_public, false)
    );
  END IF;
  
  -- Return the profile with proper casting
  RETURN QUERY
  SELECT 
    u.id,
    u.username::TEXT,
    u.display_name::TEXT,
    u.bio,
    u.profile_picture_url,
    COALESCE(u.is_public, false),
    u.created_at,
    u.updated_at
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;

-- Set ownership
ALTER FUNCTION create_user_profile_manual(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- STEP 2: Update the trigger function to not overwrite existing display_name
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  -- Use INSERT ... ON CONFLICT DO NOTHING to avoid overwriting
  INSERT INTO public.users (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))::VARCHAR,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))::VARCHAR
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't overwrite if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
