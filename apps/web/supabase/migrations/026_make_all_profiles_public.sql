-- ============================================
-- Migration: Make All Profiles Public
-- All profiles are now publicly visible by default
-- ============================================

-- 1. Set all existing profiles to public
UPDATE users SET is_public = true WHERE is_public = false OR is_public IS NULL;

-- 2. Change the default value for new profiles to true
ALTER TABLE users ALTER COLUMN is_public SET DEFAULT true;

-- 3. Add a comment to document this change
COMMENT ON COLUMN users.is_public IS 'Deprecated: All profiles are now public. This column is kept for backwards compatibility but is no longer used.';
