-- Create play_history table to store imported music listening history
CREATE TABLE IF NOT EXISTS play_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  album_cover_url TEXT,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT DEFAULT 'imported', -- 'imported', 'spotify', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_history_user_played_at ON play_history(user_id, played_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own play history
CREATE POLICY "Users can view their own play history" ON play_history
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy: users can insert their own play history
CREATE POLICY "Users can insert their own play history" ON play_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: users can update their own play history
CREATE POLICY "Users can update their own play history" ON play_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy: users can delete their own play history
CREATE POLICY "Users can delete their own play history" ON play_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_play_history_updated_at
  BEFORE UPDATE ON play_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
