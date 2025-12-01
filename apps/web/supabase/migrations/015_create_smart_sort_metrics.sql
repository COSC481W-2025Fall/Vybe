-- Create smart_sort_metrics table to track performance data
-- This enables data-driven optimization based on playlist/song counts

CREATE TABLE IF NOT EXISTS smart_sort_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Size metrics
  playlist_count INTEGER NOT NULL,
  total_song_count INTEGER NOT NULL,
  songs_per_playlist_avg DECIMAL(10, 2),
  
  -- Timing metrics (in seconds)
  total_duration DECIMAL(10, 3) NOT NULL,
  metadata_fetch_duration DECIMAL(10, 3),
  ai_analysis_duration DECIMAL(10, 3),
  database_update_duration DECIMAL(10, 3),
  
  -- Per-song metrics
  avg_song_metadata_time DECIMAL(10, 3),
  songs_with_spotify INTEGER DEFAULT 0,
  songs_with_lastfm INTEGER DEFAULT 0,
  songs_with_musicbrainz INTEGER DEFAULT 0,
  
  -- Optimization settings used
  metadata_concurrency INTEGER,
  batch_size INTEGER,
  skipped_slow_sources BOOLEAN DEFAULT false,
  
  -- Success/failure
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_smart_sort_metrics_group_id ON smart_sort_metrics(group_id);
CREATE INDEX IF NOT EXISTS idx_smart_sort_metrics_user_id ON smart_sort_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_sort_metrics_song_count ON smart_sort_metrics(total_song_count);
CREATE INDEX IF NOT EXISTS idx_smart_sort_metrics_created_at ON smart_sort_metrics(created_at DESC);

-- Create index for optimization queries (group by song count ranges)
CREATE INDEX IF NOT EXISTS idx_smart_sort_metrics_optimization 
ON smart_sort_metrics(total_song_count, success, created_at DESC);

-- Enable Row Level Security
ALTER TABLE smart_sort_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own metrics
CREATE POLICY "Users can view their own smart sort metrics"
ON smart_sort_metrics FOR SELECT
USING (auth.uid() = user_id);

-- Policy: System can insert metrics (via service role or authenticated users)
CREATE POLICY "Authenticated users can insert smart sort metrics"
ON smart_sort_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE smart_sort_metrics IS 'Tracks performance metrics for smart sort operations to enable data-driven optimization';
COMMENT ON COLUMN smart_sort_metrics.total_song_count IS 'Total number of songs processed';
COMMENT ON COLUMN smart_sort_metrics.avg_song_metadata_time IS 'Average time per song for metadata fetching';
COMMENT ON COLUMN smart_sort_metrics.skipped_slow_sources IS 'Whether slow metadata sources (MusicBrainz) were skipped';

