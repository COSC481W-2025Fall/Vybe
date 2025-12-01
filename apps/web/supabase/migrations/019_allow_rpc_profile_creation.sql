-- This migration adds a policy to allow profile creation for valid auth users
-- This works around RLS issues with SECURITY DEFINER functions in Supabase
-- The policy allows inserts if the user_id exists in auth.users

-- Drop the existing insert policy and recreate it with a more permissive check
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create a more permissive insert policy that allows creation if:
-- 1. auth.uid() matches id (normal case), OR
-- 2. The id exists in auth.users (allows RPC function to create profiles)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = users.id)
  );

-- Note: This policy allows the RPC function to create profiles because
-- it checks if the user_id exists in auth.users, which should be true
-- for any valid user. The function itself validates the user_id parameter.
