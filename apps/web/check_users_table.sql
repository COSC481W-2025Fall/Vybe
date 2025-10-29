-- Run this in your Supabase SQL Editor to check if the users table has data

-- Check if users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) AS users_table_exists;

-- Count users in public.users
SELECT COUNT(*) as user_count FROM users;

-- Show all users
SELECT id, username, display_name, created_at FROM users LIMIT 10;

-- Check auth.users (should have your actual users)
SELECT id, email, created_at FROM auth.users LIMIT 10;

-- Compare: which auth.users don't have a profile yet?
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

