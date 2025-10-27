-- Migration SQL Commands for Friends Feature
-- Run these commands in your Supabase SQL Editor

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friends_user1_id ON friends(user1_id);
CREATE INDEX IF NOT EXISTS idx_friends_user2_id ON friends(user2_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- Enable RLS
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they are part of
CREATE POLICY "Users can view their friendships" ON friends
  FOR SELECT USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

-- Users can send friend requests (as user1_id where user1_id is less than user2_id)
CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (user1_id = auth.uid());

-- Users can accept friend requests (update where they are user2_id)
CREATE POLICY "Users can accept friend requests" ON friends
  FOR UPDATE USING (
    (user1_id = auth.uid() OR user2_id = auth.uid())
    AND status = 'pending'
  );

-- Users can delete friendships (cancel requests, unfriend)
CREATE POLICY "Users can delete friendships" ON friends
  FOR DELETE USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

