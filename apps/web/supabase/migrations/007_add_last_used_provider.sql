-- Add last_used_provider column to track which music service the user last authenticated with
-- This helps us know whether to show Spotify or YouTube data in the library

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_used_provider'
  ) THEN
    ALTER TABLE users ADD COLUMN last_used_provider TEXT;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_last_used_provider ON users(last_used_provider);
