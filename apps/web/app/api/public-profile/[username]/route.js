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
    const today = new Date().toISOString().split('T')[0];
    
    const { data: sotdData, error: sotdError } = await supabase
      .from('song_of_the_day')
      .select('*')
      .eq('user_id', data.id)
      .gte('shared_at', `${today}T00:00:00`)
      .lte('shared_at', `${today}T23:59:59`)
      .order('shared_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sotdError && sotdData) {
      songOfTheDay = {
        title: sotdData.title,
        artist: sotdData.artist,
        album: sotdData.album,
        image_url: sotdData.image_url,
        spotify_url: sotdData.spotify_url,
        youtube_url: sotdData.youtube_url,
        shared_at: sotdData.shared_at,
      };
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
