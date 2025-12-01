-- Ensure the RPC function can bypass RLS by granting necessary permissions
-- This migration should be run after 017_create_user_profile_rpc.sql

-- Grant necessary permissions to the function owner (postgres) if not already granted
-- Note: postgres role should already have these, but we're being explicit

-- Ensure the function exists and is owned by postgres
DO $$
BEGIN
  -- Check if function exists and change owner if needed
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'create_user_profile_manual'
  ) THEN
    -- Function exists, ensure it's owned by postgres
    ALTER FUNCTION create_user_profile_manual(UUID, TEXT, TEXT, TEXT) OWNER TO postgres;
  END IF;
END $$;

-- The SECURITY DEFINER function should already bypass RLS when owned by postgres
-- But we can also add a policy that allows service role to insert/update
-- This is a backup in case SECURITY DEFINER doesn't work as expected

-- Note: In Supabase, SECURITY DEFINER functions owned by postgres should bypass RLS
-- If this still doesn't work, the issue might be with how Supabase handles RLS in functions
