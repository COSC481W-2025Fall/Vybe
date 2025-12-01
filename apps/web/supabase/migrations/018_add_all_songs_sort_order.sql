-- Migration: Add "All" playlist sort order columns to groups table
-- Purpose: Store unified sort order for the "All" view (virtual playlist aggregation)
-- Date: 2025-12-01

-- Add column for storing ordered array of song IDs
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS all_songs_sort_order JSONB DEFAULT NULL;

-- Add column for tracking when the "All" view was last sorted
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS all_songs_sorted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN groups.all_songs_sort_order IS 'Ordered array of song IDs for the unified "All" view sort. Example: ["uuid-1", "uuid-2", ...]';
COMMENT ON COLUMN groups.all_songs_sorted_at IS 'Timestamp of when the "All" view was last sorted by AI';

-- Create index for faster lookups on sorted groups
CREATE INDEX IF NOT EXISTS idx_groups_all_songs_sorted_at 
ON groups(all_songs_sorted_at) 
WHERE all_songs_sorted_at IS NOT NULL;

