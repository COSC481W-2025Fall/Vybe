// app/api/friends/songs/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch friends' songs via SECURITY DEFINER RPC (bypasses RLS safely)
    const { data, error } = await supabase.rpc('get_friends_of_user_songs', {
      current_user_id: user.id
    });

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch friends songs',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    const songs = (data || []).map(row => ({
      id: row.song_id,
      title: row.song_name,
      artist: row.artist,
      album: row.album,
      spotifyUrl: row.spotify_url,
      youtubeUrl: row.youtube_url,
      shared_at: row.created_at,
      shared_by: row.friend_display_name || row.friend_username || 'Friend',
      shared_by_username: row.friend_username || null,
      shared_by_avatar: row.friend_profile_picture_url || null
    }));

    return NextResponse.json({ success: true, songs });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
 
