-- Migration: Create user_notification_preferences and user_privacy_settings tables
-- These tables store user preferences for notifications and privacy settings

-- Create user_privacy_settings table
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    playlist_visibility TEXT NOT NULL DEFAULT 'public' CHECK (playlist_visibility IN ('public', 'friends', 'private')),
    listening_activity_visible BOOLEAN NOT NULL DEFAULT true,
    song_of_day_visibility TEXT NOT NULL DEFAULT 'public' CHECK (song_of_day_visibility IN ('public', 'friends', 'private')),
    friend_request_setting TEXT NOT NULL DEFAULT 'everyone' CHECK (friend_request_setting IN ('everyone', 'friends_of_friends', 'nobody')),
    searchable BOOLEAN NOT NULL DEFAULT true,
    activity_feed_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
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
    email_frequency TEXT NOT NULL DEFAULT 'instant' CHECK (email_frequency IN ('instant', 'daily', 'weekly')),
    -- Master Toggle
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON public.user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON public.user_notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_privacy_settings
-- Users can only read their own privacy settings
CREATE POLICY "Users can read own privacy settings"
    ON public.user_privacy_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own privacy settings
CREATE POLICY "Users can insert own privacy settings"
    ON public.user_privacy_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update own privacy settings"
    ON public.user_privacy_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own privacy settings
CREATE POLICY "Users can delete own privacy settings"
    ON public.user_privacy_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for user_notification_preferences
-- Users can only read their own notification preferences
CREATE POLICY "Users can read own notification preferences"
    ON public.user_notification_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own notification preferences
CREATE POLICY "Users can insert own notification preferences"
    ON public.user_notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY "Users can update own notification preferences"
    ON public.user_notification_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notification preferences
CREATE POLICY "Users can delete own notification preferences"
    ON public.user_notification_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to both tables (drop first if exists)
DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON public.user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at
    BEFORE UPDATE ON public.user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON public.user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
