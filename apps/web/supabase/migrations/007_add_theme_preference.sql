-- Add theme_preference column to users table
-- This migration adds support for user theme preferences (light, dark, or system)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE users ADD COLUMN theme_preference VARCHAR(10) DEFAULT 'system';
    -- Add check constraint to ensure valid values
    ALTER TABLE users ADD CONSTRAINT theme_preference_check 
      CHECK (theme_preference IN ('light', 'dark', 'system'));
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_users_theme_preference ON users(theme_preference);
    
    -- Add comment for documentation
    COMMENT ON COLUMN users.theme_preference IS 'User theme preference: light, dark, or system (follows OS preference)';
  END IF;
END $$;

