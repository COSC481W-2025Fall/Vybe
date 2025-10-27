-- Create group_playlists table
CREATE TABLE IF NOT EXISTS group_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  platform VARCHAR NOT NULL CHECK (platform IN ('youtube', 'spotify')),
  playlist_url TEXT NOT NULL,
  playlist_id VARCHAR, -- External playlist ID from YT/Spotify
  track_count INTEGER DEFAULT 0,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create playlist_songs table
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES group_playlists(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  artist VARCHAR,
  duration INTEGER, -- Duration in seconds
  thumbnail_url TEXT,
  external_id VARCHAR, -- YouTube video ID or Spotify track ID
  position INTEGER NOT NULL, -- Order in playlist
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create song_likes table
CREATE TABLE IF NOT EXISTS song_likes (
  song_id UUID NOT NULL REFERENCES playlist_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (song_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_playlists_group_id ON group_playlists(group_id);
CREATE INDEX IF NOT EXISTS idx_group_playlists_added_by ON group_playlists(added_by);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_song_likes_song_id ON song_likes(song_id);
CREATE INDEX IF NOT EXISTS idx_song_likes_user_id ON song_likes(user_id);

-- Enable Row Level Security
ALTER TABLE group_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_likes ENABLE ROW LEVEL SECURITY;

-- Policies for group_playlists
CREATE POLICY "Users can view playlists in their groups" ON group_playlists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_playlists.group_id
      AND (
        groups.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = groups.id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group members can add playlists" ON group_playlists
  FOR INSERT WITH CHECK (
    auth.uid() = added_by AND
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_playlists.group_id
      AND (
        groups.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = groups.id
          AND group_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Playlist creators and group owners can update playlists" ON group_playlists
  FOR UPDATE USING (
    auth.uid() = added_by OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_playlists.group_id
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Playlist creators and group owners can delete playlists" ON group_playlists
  FOR DELETE USING (
    auth.uid() = added_by OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_playlists.group_id
      AND groups.owner_id = auth.uid()
    )
  );

-- Policies for playlist_songs
CREATE POLICY "Users can view songs in their group playlists" ON playlist_songs
  FOR SELECT USING (
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

CREATE POLICY "Group members can add songs" ON playlist_songs
  FOR INSERT WITH CHECK (
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

CREATE POLICY "Group members can delete songs" ON playlist_songs
  FOR DELETE USING (
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

-- Policies for song_likes
CREATE POLICY "Users can view all likes on group songs" ON song_likes
  FOR SELECT USING (
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

CREATE POLICY "Users can like songs" ON song_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON song_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at on group_playlists table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_playlists_updated_at ON group_playlists;
CREATE TRIGGER update_group_playlists_updated_at
  BEFORE UPDATE ON group_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update track_count when songs are added/removed
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE group_playlists
    SET track_count = track_count + 1
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE group_playlists
    SET track_count = track_count - 1
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_track_count_on_insert ON playlist_songs;
CREATE TRIGGER update_track_count_on_insert
  AFTER INSERT ON playlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_track_count();

DROP TRIGGER IF EXISTS update_track_count_on_delete ON playlist_songs;
CREATE TRIGGER update_track_count_on_delete
  AFTER DELETE ON playlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_track_count();
