-- Quick check: Get the current create_user_profile_manual function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_user_profile_manual'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- Also check users table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;
