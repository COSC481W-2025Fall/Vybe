-- Create songs_of_the_day table
CREATE TABLE IF NOT EXISTS songs_of_the_day (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  song_name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  image_url TEXT,
  preview_url TEXT,
  spotify_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_songs_of_the_day_user_created
ON songs_of_the_day(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE songs_of_the_day ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own songs of the day
CREATE POLICY "Users can view their own songs of the day"
ON songs_of_the_day
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can view friends' songs of the day
CREATE POLICY "Users can view friends songs of the day"
ON songs_of_the_day
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM friendships
    WHERE (
      (friendships.user_id = auth.uid() AND friendships.friend_id = songs_of_the_day.user_id)
      OR
      (friendships.friend_id = auth.uid() AND friendships.user_id = songs_of_the_day.user_id)
    )
    AND friendships.status = 'accepted'
  )
);

-- Policy: Users can insert their own songs of the day
CREATE POLICY "Users can insert their own songs of the day"
ON songs_of_the_day
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own songs of the day
CREATE POLICY "Users can update their own songs of the day"
ON songs_of_the_day
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own songs of the day
CREATE POLICY "Users can delete their own songs of the day"
ON songs_of_the_day
FOR DELETE
USING (auth.uid() = user_id);
