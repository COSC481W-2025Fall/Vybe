# Database Schema for Groups Feature

This document outlines the database tables needed for the group creation feature.

## Required Tables

### 1. `groups` table
```sql
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  privacy VARCHAR(10) DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'deleted')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_expires_at ON groups(expires_at);
CREATE INDEX idx_groups_privacy ON groups(privacy);
```

### 2. `group_members` table
```sql
CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
```
### 3. `friends` table
```sql
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
```

### 4. `friend_requests` table (Alternative approach)
```sql
CREATE TABLE friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Create indexes for better performance
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
```


## Row Level Security (RLS) Policies

### Groups table policies
```sql
-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Users can view groups they are members of
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create groups
CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only group admins can update groups
CREATE POLICY "Admins can update groups" ON groups
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only group admins can delete groups
CREATE POLICY "Admins can delete groups" ON groups
  FOR DELETE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Group members table policies
```sql
-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of groups they belong to
CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can join groups (insert themselves)
CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can leave groups (delete themselves)
CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (user_id = auth.uid());

-- Group admins can manage members
CREATE POLICY "Admins can manage members" ON group_members
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Friends table policies
```sql
-- Enable RLS
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they are part of
CREATE POLICY "Users can view their friendships" ON friends
  FOR SELECT USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

-- Users can send friend requests (insert)
CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (user1_id = auth.uid());

-- Users can accept/decline friend requests sent to them
CREATE POLICY "Users can respond to friend requests" ON friends
  FOR UPDATE USING (user2_id = auth.uid());

-- Users can delete their own friendships
CREATE POLICY "Users can delete their friendships" ON friends
  FOR DELETE USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );
```

## Migration Commands (If Tables Already Exist)

If you already have the `groups` table, run these commands to add the new columns:

```sql
-- Add privacy column
ALTER TABLE groups ADD COLUMN privacy VARCHAR(10) DEFAULT 'public' CHECK (privacy IN ('public', 'private'));

-- Add status column for temporary groups
ALTER TABLE groups ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'deleted'));

-- Add expiration column for cleanup
ALTER TABLE groups ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for new columns
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_expires_at ON groups(expires_at);
CREATE INDEX idx_groups_privacy ON groups(privacy);
```

## Setup Instructions

1. **Create the tables** in your Supabase SQL editor (or run migration commands if tables exist)
2. **Set up RLS policies** for security
3. **Test the policies** by creating a group and joining it
4. **Update your `.env.local`** with Supabase credentials

## Notes

- Group codes are 6 characters long (A-Z, 0-9)
- The creator automatically becomes an admin member
- RLS ensures users can only see groups they belong to
- All timestamps use UTC timezone
- **Privacy levels**: 'public' (anyone can join) or 'private' (invite only)
- **Status levels**: 'pending' (temporary, expires in 3 days), 'active' (permanent), 'deleted' (soft delete)
- **Temporary groups**: Groups created without members start as 'pending' and expire after 3 days
- **Group activation**: When someone joins a pending group, it becomes 'active' and expires_at is set to null
