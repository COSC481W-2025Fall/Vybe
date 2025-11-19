-- ============================================
-- Privacy Settings Table Migration
-- Task 3.5: Create Privacy Database Table
-- ============================================
-- 
-- This migration creates the user_privacy_settings table
-- and related infrastructure for privacy settings management.
--
-- Run this migration in your Supabase SQL editor or via
-- your database migration tool.
--
-- See SUPABASE_PRIVACY_SETTINGS_SETUP.md for detailed
-- documentation and setup instructions.
-- ============================================

-- 1. Create user_privacy_settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Visibility Settings
  profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  playlist_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  song_of_day_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  
  -- Boolean Settings
  listening_activity_visible BOOLEAN NOT NULL DEFAULT true,
  searchable BOOLEAN NOT NULL DEFAULT true,
  activity_feed_visible BOOLEAN NOT NULL DEFAULT true,
  
  -- Friend Request Settings
  friend_request_setting VARCHAR(20) NOT NULL DEFAULT 'everyone',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  CHECK (profile_visibility IN ('public', 'friends', 'private')),
  CHECK (playlist_visibility IN ('public', 'friends', 'private')),
  CHECK (song_of_day_visibility IN ('public', 'friends', 'private')),
  CHECK (friend_request_setting IN ('everyone', 'friends_of_friends', 'nobody'))
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id 
  ON user_privacy_settings(user_id);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Policy: Users can view their own privacy settings
DROP POLICY IF EXISTS "Users can view own privacy settings" ON user_privacy_settings;
CREATE POLICY "Users can view own privacy settings"
ON user_privacy_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own privacy settings
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON user_privacy_settings;
CREATE POLICY "Users can insert own privacy settings"
ON user_privacy_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own privacy settings
DROP POLICY IF EXISTS "Users can update own privacy settings" ON user_privacy_settings;
CREATE POLICY "Users can update own privacy settings"
ON user_privacy_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own privacy settings
DROP POLICY IF EXISTS "Users can delete own privacy settings" ON user_privacy_settings;
CREATE POLICY "Users can delete own privacy settings"
ON user_privacy_settings
FOR DELETE
USING (auth.uid() = user_id);

-- 7. (Optional) Create audit log table for privacy changes
CREATE TABLE IF NOT EXISTS privacy_settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL DEFAULT 'privacy_settings_updated',
  details JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_user_id 
  ON privacy_settings_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_created_at 
  ON privacy_settings_audit_log(created_at DESC);

-- Enable RLS on audit log
ALTER TABLE privacy_settings_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON privacy_settings_audit_log;
CREATE POLICY "Users can view own audit logs"
ON privacy_settings_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- 8. (Optional) Create function to automatically create default privacy settings for new users
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create privacy settings when a new user is created
DROP TRIGGER IF EXISTS on_user_created_create_privacy_settings ON auth.users;
CREATE TRIGGER on_user_created_create_privacy_settings
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_privacy_settings();

-- ============================================
-- Migration Complete
-- ============================================
-- 
-- The privacy settings table is now set up with:
-- ✓ Table structure with all required columns
-- ✓ Check constraints for enum validation
-- ✓ Unique constraint on user_id
-- ✓ Indexes for performance
-- ✓ Automatic updated_at trigger
-- ✓ Row Level Security policies
-- ✓ Optional audit logging table
-- ✓ Optional automatic default settings for new users
--
-- Next steps:
-- 1. Verify the migration ran successfully
-- 2. Test the API endpoints
-- 3. Verify RLS policies work correctly
-- ============================================


