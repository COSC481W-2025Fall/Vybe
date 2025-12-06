// app/api/song-of-the-day/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    // Get today's date at midnight (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get the user's song of the day for today
    const { data: songOfDay, error } = await supabase
      .from('songs_of_the_day')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching song of the day:', error);
      return NextResponse.json({ error: 'Failed to fetch song of the day' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      songOfDay: songOfDay || null,
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { songId, songName, artist, album, imageUrl, previewUrl, spotifyUrl, youtubeUrl } = body;

    if (!songName || !artist) {
      return NextResponse.json({ error: 'Song name and artist are required' }, { status: 400 });
    }

    // Generate a songId if not provided
    const finalSongId = songId || `${songName}-${artist}`.replace(/\s+/g, '-').toLowerCase().slice(0, 100);

    // Get today's date at midnight (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if user already has a song of the day for today
    const { data: existing } = await supabase
      .from('songs_of_the_day')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .maybeSingle();

    if (existing) {
      // Update existing song of the day
      const { data: updated, error: updateError } = await supabase
        .from('songs_of_the_day')
        .update({
          song_id: finalSongId,
          song_name: songName,
          artist,
          album,
          image_url: imageUrl,
          preview_url: previewUrl,
          spotify_url: spotifyUrl,
          youtube_url: youtubeUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating song of the day:', updateError);
        return NextResponse.json({ error: 'Failed to update song of the day' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Song of the day updated',
        songOfDay: updated,
      });
    } else {
      // Create new song of the day
      const { data: created, error: createError } = await supabase
        .from('songs_of_the_day')
        .insert({
          user_id: user.id,
          song_id: finalSongId,
          song_name: songName,
          artist,
          album,
          image_url: imageUrl,
          preview_url: previewUrl,
          spotify_url: spotifyUrl,
          youtube_url: youtubeUrl,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating song of the day:', createError);
        return NextResponse.json({ error: 'Failed to create song of the day' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Song of the day set',
        songOfDay: created,
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date at midnight (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Delete today's song of the day
    const { error: deleteError } = await supabase
      .from('songs_of_the_day')
      .delete()
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if (deleteError) {
      console.error('Error deleting song of the day:', deleteError);
      return NextResponse.json({ error: 'Failed to delete song of the day' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Song of the day removed',
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
