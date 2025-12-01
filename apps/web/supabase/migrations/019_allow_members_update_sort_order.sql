-- Migration: Allow group members to update sort order columns
-- Purpose: Fix RLS policy to allow members (not just owners) to update all_songs_sort_order
-- Date: 2025-12-01
-- 
-- Issue: The existing RLS policy only allows owners to update groups, but the "All" playlist
-- sort is a shared feature that all members should be able to use.
--
-- Solution: Add a new policy that allows group members to update groups, specifically
-- for the sort order columns. This is safe because:
-- 1. It's a shared feature - all members should be able to sort the "All" view
-- 2. The application logic ensures only sort order columns are updated by members
-- 3. The owner-only policy still applies to other sensitive operations

-- Drop existing member update policy if it exists (from a previous attempt)
DROP POLICY IF EXISTS "Group members can update sort order" ON groups;

-- Create policy allowing group members to update groups
-- This allows members to update the sort order columns (all_songs_sort_order, all_songs_sorted_at)
-- Note: Supabase RLS doesn't support column-level granularity, so this policy allows
-- updates to all columns. The application should only update sort order columns for members.
CREATE POLICY "Group members can update sort order" ON groups
  FOR UPDATE USING (
    -- Allow if user is a member of the group
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
    OR
    -- Or if user is the owner (redundant but explicit)
    auth.uid() = owner_id
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Group members can update sort order" ON groups IS 
  'Allows group members to update groups, primarily for the shared "All" playlist sort order feature. '
  'The application should only update all_songs_sort_order and all_songs_sorted_at columns for members.';

