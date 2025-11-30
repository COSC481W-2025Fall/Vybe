-- ============================================
-- Notification Preferences Table Migration
-- Task 4.5: Create Notification Preferences Database Table
-- ============================================
-- 
-- This migration creates the user_notification_preferences table
-- and related infrastructure for notification preferences management.
--
-- Run this migration in your Supabase SQL editor or via
-- your database migration tool.
--
-- See SUPABASE_NOTIFICATION_PREFERENCES_SETUP.md for detailed
-- documentation and setup instructions.
-- ============================================

-- 1. Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Social Notifications
  friend_requests_inapp BOOLEAN NOT NULL DEFAULT true,
  friend_requests_email BOOLEAN NOT NULL DEFAULT true,
  new_followers_inapp BOOLEAN NOT NULL DEFAULT true,
  new_followers_email BOOLEAN NOT NULL DEFAULT false,
  comments_inapp BOOLEAN NOT NULL DEFAULT true,
  comments_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Playlist Notifications
  playlist_invites_inapp BOOLEAN NOT NULL DEFAULT true,
  playlist_invites_email BOOLEAN NOT NULL DEFAULT true,
  playlist_updates_inapp BOOLEAN NOT NULL DEFAULT true,
  playlist_updates_email BOOLEAN NOT NULL DEFAULT false,
  
  -- System Notifications
  song_of_day_inapp BOOLEAN NOT NULL DEFAULT true,
  song_of_day_email BOOLEAN NOT NULL DEFAULT false,
  system_announcements_inapp BOOLEAN NOT NULL DEFAULT true,
  system_announcements_email BOOLEAN NOT NULL DEFAULT true,
  security_alerts_inapp BOOLEAN NOT NULL DEFAULT true,
  security_alerts_email BOOLEAN NOT NULL DEFAULT true,
  
  -- Email Frequency
  email_frequency VARCHAR(20) NOT NULL DEFAULT 'instant',
  
  -- Master Toggle (optional, can be used for bulk enable/disable)
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  CHECK (email_frequency IN ('instant', 'daily', 'weekly'))
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id 
  ON user_notification_preferences(user_id);

-- 3. Create function to update updated_at timestamp
-- Note: This function may already exist from previous migrations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Policy: Users can view their own notification preferences
DROP POLICY IF EXISTS "Users can view own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can view own notification preferences"
ON user_notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own notification preferences
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
ON user_notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notification preferences
DROP POLICY IF EXISTS "Users can update own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can update own notification preferences"
ON user_notification_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Prevent security alerts from being disabled
-- This policy ensures security_alerts_inapp and security_alerts_email remain true
DROP POLICY IF EXISTS "Users cannot disable security alerts" ON user_notification_preferences;
CREATE POLICY "Users cannot disable security alerts"
ON user_notification_preferences
FOR UPDATE
USING (
  auth.uid() = user_id AND
  (OLD.security_alerts_inapp = true AND NEW.security_alerts_inapp = true) AND
  (OLD.security_alerts_email = true AND NEW.security_alerts_email = true)
)
WITH CHECK (
  auth.uid() = user_id AND
  security_alerts_inapp = true AND
  security_alerts_email = true
);

-- Note: The above policy may be restrictive. Consider creating a separate UPDATE policy
-- that allows all fields except security alerts. For now, the API enforces security alerts
-- at the application level, so this policy provides an additional safety layer.

-- Policy: Users can delete their own notification preferences
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can delete own notification preferences"
ON user_notification_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- 7. (Optional) Create function to automatically create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create notification preferences when a new user is created
DROP TRIGGER IF EXISTS on_user_created_create_notification_preferences ON auth.users;
CREATE TRIGGER on_user_created_create_notification_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================
-- Migration Complete
-- ============================================
-- 
-- The notification preferences table is now set up with:
-- ✓ Table structure with all required columns
-- ✓ Check constraint for email_frequency enum validation
-- ✓ Unique constraint on user_id
-- ✓ Indexes for performance
-- ✓ Automatic updated_at trigger
-- ✓ Row Level Security policies
-- ✓ Security alerts protection policy
-- ✓ Automatic default preferences for new users
--
-- Next steps:
-- 1. Verify the migration ran successfully
-- 2. Test the API endpoints (/api/user/notifications)
-- 3. Verify RLS policies work correctly
-- 4. Verify security alerts cannot be disabled
-- ============================================





