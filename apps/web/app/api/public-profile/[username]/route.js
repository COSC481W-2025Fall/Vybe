import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    // ⚠️ In new Next versions, params might be a Promise – be defensive
    const resolvedParams = await params;
    const username = resolvedParams?.username;

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
        { status: 400 }
      );
    }

    // Await cookies() for Next.js 15+
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // DEBUG: log what we're querying for
    console.log('[public-profile] looking up username:', username);

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, profile_picture_url')
      .eq('username', username)
      .single();

    if (error) {
      console.error('[public-profile] Supabase error:', error);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Also fetch the user's song of the day
    let songOfTheDay = null;
    
    // Get today's date at midnight (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    console.log('[public-profile] Looking for song of the day for user:', data.id, 'since:', today.toISOString());
    
    // First, DEBUG: check if there's ANY song for this user (without date filter)
    const { data: anySong, error: anyError } = await supabase
      .from('songs_of_the_day')
      .select('*')
      .eq('user_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    console.log('[public-profile] Any song ever for this user:', { anySong, anyError });
    
    // Now query for today's song
    const { data: sotdData, error: sotdError } = await supabase
      .from('songs_of_the_day')
      .select('*')
      .eq('user_id', data.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('[public-profile] songs_of_the_day TODAY query result:', { sotdData, sotdError });

    if (!sotdError && sotdData) {
      songOfTheDay = {
        title: sotdData.song_name,
        artist: sotdData.artist,
        album: sotdData.album,
        image_url: sotdData.image_url,
        spotify_url: sotdData.spotify_url,
        youtube_url: sotdData.youtube_url,
        shared_at: sotdData.created_at,
      };
      console.log('[public-profile] Found song of the day:', songOfTheDay);
    } else if (anySong) {
      console.log('[public-profile] User has a song but from a previous day:', anySong.created_at);
    } else {
      console.log('[public-profile] No song of the day found for this user at all');
    }

    // All profiles are now publicly visible
    return NextResponse.json(
      {
        profile: {
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          profile_picture_url: data.profile_picture_url,
          song_of_the_day: songOfTheDay,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[public-profile] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
