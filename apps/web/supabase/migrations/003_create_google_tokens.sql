-- Create google_tokens table to store Google OAuth tokens
-- This table stores Google OAuth tokens for users who sign in with Google
-- Similar to the existing spotify_tokens table structure
CREATE TABLE IF NOT EXISTS google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,           -- Unique identifier for each token record
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Reference to the authenticated user
  access_token TEXT NOT NULL,                              -- Google OAuth access token
  refresh_token TEXT,                                      -- Google OAuth refresh token (optional)
  expires_at INTEGER NOT NULL,                            -- Token expiration timestamp (Unix timestamp)
  scope TEXT,                                             -- OAuth scopes granted (e.g., 'openid email profile')
  token_type TEXT DEFAULT 'Bearer',                       -- Token type (usually 'Bearer')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),      -- When token was first stored
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()       -- When token was last updated
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_expires_at ON google_tokens(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only access their own Google tokens
CREATE POLICY "Users can view their own google tokens" ON google_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy: users can insert their own google tokens
CREATE POLICY "Users can insert their own google tokens" ON google_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: users can update their own google tokens
CREATE POLICY "Users can update their own google tokens" ON google_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy: users can delete their own google tokens
CREATE POLICY "Users can delete their own google tokens" ON google_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_google_tokens_updated_at
  BEFORE UPDATE ON google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
