-- Add is_public column to users table if it doesn't exist
-- This column controls whether a user's profile is publicly visible

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE users ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN users.is_public IS 'Whether the user profile is publicly visible';
  END IF;
END $$;
