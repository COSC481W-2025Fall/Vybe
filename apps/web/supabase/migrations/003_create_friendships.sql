-- Create friendships table for managing friend relationships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a user can't friend themselves
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),

  -- Ensure no duplicate friendships (prevents user A -> user B twice)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Enable Row Level Security (RLS)
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships where they are either the user or the friend
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can create friendship requests
CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update friendships where they are the recipient (to accept/reject)
CREATE POLICY "Users can respond to friend requests" ON friendships
  FOR UPDATE USING (auth.uid() = friend_id);

-- Users can delete their own friendships (unfriend)
CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on friendships
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
