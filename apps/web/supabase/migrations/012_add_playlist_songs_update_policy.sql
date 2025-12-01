-- Add UPDATE policy for playlist_songs table
-- This allows group members to update songs (e.g., smart_sorted_order) in their group playlists

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Group members can update songs" ON playlist_songs;

-- Create UPDATE policy for playlist_songs
-- Group members and owners can update songs in their group playlists
CREATE POLICY "Group members can update songs" ON playlist_songs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_playlists gp
      JOIN groups g ON g.id = gp.group_id
      WHERE gp.id = playlist_songs.playlist_id
      AND (
        g.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = g.id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

