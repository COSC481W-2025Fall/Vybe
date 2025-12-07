-- Migration: Create export_jobs table for background playlist exports
-- This allows exports to continue even after user logs off

-- Create export_jobs table
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job configuration
  platform TEXT NOT NULL DEFAULT 'spotify' CHECK (platform IN ('spotify', 'youtube')),
  source_type TEXT NOT NULL CHECK (source_type IN ('group', 'community')),
  source_id UUID NOT NULL,
  playlist_id TEXT, -- Can be UUID or 'all'
  playlist_name TEXT NOT NULL,
  playlist_description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_collaborative BOOLEAN DEFAULT FALSE,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  current_step TEXT, -- Human readable status message
  
  -- Results (platform-agnostic naming)
  external_playlist_id TEXT, -- Spotify or YouTube playlist ID when completed
  external_playlist_url TEXT, -- Spotify or YouTube playlist URL when completed
  total_tracks INTEGER,
  exported_tracks INTEGER,
  failed_tracks INTEGER,
  error_message TEXT, -- Set if failed
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Rate limiting metadata
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Daily retry tracking
  daily_retry_count INTEGER DEFAULT 0,
  last_daily_retry_at TIMESTAMPTZ,
  max_daily_retries INTEGER DEFAULT 7 -- Give up after a week of daily retries
);

-- Index for fetching user's jobs
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);

-- Index for processing pending jobs
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status, created_at);

-- Index for rate limit handling
CREATE INDEX IF NOT EXISTS idx_export_jobs_retry ON export_jobs(status, next_retry_at) WHERE status = 'pending';

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_export_jobs_platform ON export_jobs(platform);

-- RLS policies
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
DROP POLICY IF EXISTS "Users can view their own export jobs" ON export_jobs;
CREATE POLICY "Users can view their own export jobs" ON export_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
DROP POLICY IF EXISTS "Users can create their own export jobs" ON export_jobs;
CREATE POLICY "Users can create their own export jobs" ON export_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending jobs
DROP POLICY IF EXISTS "Users can update their own export jobs" ON export_jobs;
CREATE POLICY "Users can update their own export jobs" ON export_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can update any job (for background processing)
-- This is handled by using service_role key in the API

COMMENT ON TABLE export_jobs IS 'Background jobs for exporting playlists to Spotify with rate-limit handling';

