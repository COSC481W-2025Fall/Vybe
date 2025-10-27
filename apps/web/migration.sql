-- Migration SQL Commands for Enhanced Groups Feature + Friends System
-- Run these commands in your Supabase SQL Editor

-- =============================================
-- GROUPS TABLE UPDATES
-- =============================================

-- Add privacy column to groups table
ALTER TABLE groups ADD COLUMN privacy VARCHAR(10) DEFAULT 'public' CHECK (privacy IN ('public', 'private'));

-- Add status column for temporary groups (pending/active/deleted)
ALTER TABLE groups ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'deleted'));

-- Add expiration column for cleanup
ALTER TABLE groups ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for new columns for better performance
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_expires_at ON groups(expires_at);
CREATE INDEX idx_groups_privacy ON groups(privacy);

-- Update existing groups to have 'active' status (if any exist)
UPDATE groups SET status = 'active' WHERE status IS NULL;

-- =============================================
-- FRIENDS TABLE CREATION
-- =============================================

-- Create friends table
CREATE TABLE friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id)
);

-- Create indexes for better performance
CREATE INDEX idx_friends_user1_id ON friends(user1_id);
CREATE INDEX idx_friends_user2_id ON friends(user2_id);
CREATE INDEX idx_friends_status ON friends(status);

-- Enable RLS on friends table
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friends table
CREATE POLICY "Users can view their friendships" ON friends
  FOR SELECT USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (user1_id = auth.uid());

CREATE POLICY "Users can respond to friend requests" ON friends
  FOR UPDATE USING (user2_id = auth.uid());

CREATE POLICY "Users can delete their friendships" ON friends
  FOR DELETE USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

-- Optional: Create a function to clean up expired groups
CREATE OR REPLACE FUNCTION cleanup_expired_groups()
RETURNS void AS $$
BEGIN
  -- Mark expired pending groups as deleted
  UPDATE groups 
  SET status = 'deleted', expires_at = NOW()
  WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up expired groups at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily
-- Note: This requires pg_cron extension to be enabled in Supabase
-- SELECT cron.schedule('cleanup-expired-groups', '0 2 * * *', 'SELECT cleanup_expired_groups();');
