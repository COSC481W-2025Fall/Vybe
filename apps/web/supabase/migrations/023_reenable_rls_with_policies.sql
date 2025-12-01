-- ============================================================================
-- RE-ENABLE RLS WITH PROPER POLICIES
-- Now that the frontend is working, we can add RLS back for security
-- ============================================================================

-- Re-enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Policy: Users can view all profiles (for searching/finding friends)
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

-- Policy: Users can only update their own profile
-- This works because the API routes check auth.uid() = user.id before calling UPDATE
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile
-- This works because the API routes check auth.uid() = user.id before calling INSERT
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on users table! Migration may have failed.';
  END IF;
END $$;
