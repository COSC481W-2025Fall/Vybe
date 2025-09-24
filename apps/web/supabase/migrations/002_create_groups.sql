-- Create groups table to store group information
-- This table stores the core group data including the unique join code
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,           -- Unique identifier for each group
  name TEXT NOT NULL,                                       -- Group name (required)
  description TEXT,                                        -- Optional group description
  join_code TEXT UNIQUE NOT NULL,                          -- 6-character code for joining (unique constraint)
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Creator's user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),       -- Timestamp when group was created
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()        -- Timestamp for last update
);

-- Create group_members table to store group membership
-- This table tracks which users belong to which groups and their roles
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,           -- Unique identifier for each membership
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE, -- Reference to the group
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Reference to the user
  role TEXT DEFAULT 'member',                              -- User's role: 'admin' (creator) or 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),       -- When user joined the group
  UNIQUE(group_id, user_id)                               -- Prevent duplicate memberships
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_join_code ON groups(join_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for groups table
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" ON groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups" ON groups
  FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for group_members table
CREATE POLICY "Users can view group memberships" ON group_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at for groups
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique join codes
-- This PostgreSQL function creates a 6-character alphanumeric code that's guaranteed to be unique
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code using MD5 hash of random data
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if this code already exists in the groups table
    SELECT EXISTS(SELECT 1 FROM groups WHERE join_code = code) INTO exists;
    
    -- If code doesn't exist, return it (guaranteed unique)
    IF NOT exists THEN
      RETURN code;
    END IF;
    -- If code exists, loop and try again
  END LOOP;
END;
$$ LANGUAGE plpgsql;
