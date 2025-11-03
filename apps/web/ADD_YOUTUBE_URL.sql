-- Add youtube_url column to existing songs_of_the_day table
-- Run this in your Supabase SQL Editor if you already created the table

ALTER TABLE songs_of_the_day
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added youtube_url column to songs_of_the_day table!';
END $$;
