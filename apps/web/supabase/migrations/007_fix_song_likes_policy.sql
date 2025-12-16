-- Fix song_likes RLS policies
-- Drop existing policies if they exist and recreate them

-- First, ensure RLS is enabled
ALTER TABLE song_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can like songs" ON song_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON song_likes;
DROP POLICY IF EXISTS "Users can view all likes on group songs" ON song_likes;

-- Recreate INSERT policy - allow any authenticated user to insert their own likes
CREATE POLICY "Users can like songs" ON song_likes
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recreate DELETE policy - allow users to delete their own likes
CREATE POLICY "Users can unlike their own likes" ON song_likes
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Recreate SELECT policy - allow users to view likes on songs in groups they're members of
CREATE POLICY "Users can view all likes on group songs" ON song_likes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlist_songs ps
      JOIN group_playlists gp ON gp.id = ps.playlist_id
      JOIN groups g ON g.id = gp.group_id
      WHERE ps.id = song_likes.song_id
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

