# Database Schema for Groups Feature

This document outlines the database tables needed for the group creation feature.

## Required Tables

### 1. `groups` table
```sql
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(6) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster code lookups
CREATE INDEX idx_groups_code ON groups(code);
CREATE INDEX idx_groups_created_by ON groups(created_by);
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

## Setup Instructions

1. **Create the tables** in your Supabase SQL editor
2. **Set up RLS policies** for security
3. **Test the policies** by creating a group and joining it
4. **Update your `.env.local`** with Supabase credentials

## Notes

- Group codes are 6 characters long (A-Z, 0-9)
- The creator automatically becomes an admin member
- RLS ensures users can only see groups they belong to
- All timestamps use UTC timezone
