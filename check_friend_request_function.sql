-- Check the current definition of create_friend_request function
-- Run this in Supabase SQL Editor to see what's actually in the database

-- Get the FULL function definition - this will show you exactly what's in the database
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_friend_request'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
