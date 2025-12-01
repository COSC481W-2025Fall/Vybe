-- Run these queries in Supabase SQL Editor to inspect your actual database
-- Copy and paste the results so I can see what's really there

-- 1. Check users table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check primary key constraint name
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND contype = 'p';

-- 3. Check all RPC functions related to user profiles
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%user%profile%'
ORDER BY p.proname;

-- 4. Check all triggers on users table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'public';

-- 5. Check RLS policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- 6. Check if create_user_profile_manual function exists and its signature
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosecdef as is_security_definer,
    pg_get_userbyid(p.proowner) as owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_user_profile_manual';

-- 7. Get the full function definition if it exists
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_user_profile_manual'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- 8. Check for any other functions that modify users table
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.prosrc LIKE '%users%' 
    OR p.prosrc LIKE '%display_name%'
  )
ORDER BY p.proname;
