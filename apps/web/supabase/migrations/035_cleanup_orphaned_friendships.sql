-- Migration: Cleanup orphaned and stuck friendships
-- Purpose: Fix existing data issues for users with "sticky" friends
-- Date: 2025-12-08

-- 1. Delete friendships where the user no longer exists
DELETE FROM public.friendships
WHERE user_id NOT IN (SELECT id FROM auth.users)
   OR friend_id NOT IN (SELECT id FROM auth.users);

-- 2. Delete duplicate friendships (keep the oldest one)
-- A duplicate is where user A -> user B exists multiple times
DELETE FROM public.friendships f1
USING public.friendships f2
WHERE f1.id > f2.id  -- Keep the older record (smaller id)
  AND f1.user_id = f2.user_id
  AND f1.friend_id = f2.friend_id;

-- 3. Delete "reverse duplicate" friendships where both directions exist
-- e.g., user A -> user B AND user B -> user A (both accepted)
-- Keep only one direction (the older one)
DELETE FROM public.friendships f1
USING public.friendships f2
WHERE f1.id > f2.id
  AND f1.user_id = f2.friend_id
  AND f1.friend_id = f2.user_id
  AND f1.status = 'accepted'
  AND f2.status = 'accepted';

-- 4. Log summary of current friendships state (for debugging)
DO $$
DECLARE
  total_count INTEGER;
  pending_count INTEGER;
  accepted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.friendships;
  SELECT COUNT(*) INTO pending_count FROM public.friendships WHERE status = 'pending';
  SELECT COUNT(*) INTO accepted_count FROM public.friendships WHERE status = 'accepted';
  
  RAISE NOTICE 'Friendship cleanup complete:';
  RAISE NOTICE '  Total friendships: %', total_count;
  RAISE NOTICE '  Pending requests: %', pending_count;
  RAISE NOTICE '  Accepted friends: %', accepted_count;
END $$;
