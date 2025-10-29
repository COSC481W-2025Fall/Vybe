-- Run this in your Supabase SQL Editor to verify friend requests are in the database

-- View all friendships
SELECT 
  id,
  user_id,
  friend_id,
  status,
  created_at,
  updated_at
FROM friendships
ORDER BY created_at DESC;

-- Count by status
SELECT 
  status,
  COUNT(*) as count
FROM friendships
GROUP BY status;

-- View friendships with user info (if you have auth access)
SELECT 
  f.id,
  f.status,
  f.created_at,
  u1.username as sender_username,
  u2.username as receiver_username
FROM friendships f
LEFT JOIN users u1 ON f.user_id = u1.id
LEFT JOIN users u2 ON f.friend_id = u2.id
ORDER BY f.created_at DESC;

-- Check if a specific user has sent any requests
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT * FROM friendships 
WHERE user_id = 'YOUR_USER_ID' 
OR friend_id = 'YOUR_USER_ID';

