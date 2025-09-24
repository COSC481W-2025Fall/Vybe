// Script to add sample play history data for testing
// Run this with: node scripts/seed-play-history.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const samplePlayHistory = [
  {
    track_id: 'spotify:track:1',
    track_name: 'Bohemian Rhapsody',
    artist_name: 'Queen',
    album_name: 'A Night at the Opera',
    album_cover_url: 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25f',
    played_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    source: 'imported'
  },
  {
    track_id: 'spotify:track:2',
    track_name: 'Imagine',
    artist_name: 'John Lennon',
    album_name: 'Imagine',
    album_cover_url: 'https://i.scdn.co/image/ab67616d0000b2738a3c0b7c4b4b4b4b4b4b4b4b',
    played_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    source: 'imported'
  },
  {
    track_id: 'spotify:track:3',
    track_name: 'Hotel California',
    artist_name: 'Eagles',
    album_name: 'Hotel California',
    album_cover_url: 'https://i.scdn.co/image/ab67616d0000b2738a3c0b7c4b4b4b4b4b4b4b4b',
    played_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    source: 'imported'
  },
  {
    track_id: 'spotify:track:4',
    track_name: 'Sweet Child O\' Mine',
    artist_name: 'Guns N\' Roses',
    album_name: 'Appetite for Destruction',
    album_cover_url: 'https://i.scdn.co/image/ab67616d0000b2738a3c0b7c4b4b4b4b4b4b4b4b',
    played_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    source: 'imported'
  },
  {
    track_id: 'spotify:track:5',
    track_name: 'Stairway to Heaven',
    artist_name: 'Led Zeppelin',
    album_name: 'Led Zeppelin IV',
    album_cover_url: 'https://i.scdn.co/image/ab67616d0000b2738a3c0b7c4b4b4b4b4b4b4b4b',
    played_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    source: 'imported'
  }
];

async function seedPlayHistory() {
  try {
    console.log('Seeding play history...');
    
    // Note: This script assumes you have a user ID to work with
    // In a real scenario, you'd get this from authentication
    console.log('Note: You need to manually set a user_id in the database or authenticate first');
    console.log('Sample data structure:', samplePlayHistory[0]);
    
    // Uncomment the following lines if you have a valid user_id
    /*
    const { data, error } = await supabase
      .from('play_history')
      .insert(samplePlayHistory.map(item => ({
        ...item,
        user_id: 'your-user-id-here' // Replace with actual user ID
      })));

    if (error) {
      console.error('Error seeding data:', error);
    } else {
      console.log('Successfully seeded play history data');
    }
    */
    
  } catch (error) {
    console.error('Error:', error);
  }
}

seedPlayHistory();
