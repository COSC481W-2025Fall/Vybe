import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Query play history from database, sorted by most recent first
    const { data: playHistory, error } = await supabase
      .from('play_history')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch play history' }, { status: 500 });
    }

    // Transform data to match the expected format
    const transformedHistory = playHistory.map(item => ({
      id: item.id,
      title: item.track_name,
      artist: item.artist_name,
      album: item.album_name || '',
      cover: item.album_cover_url || '',
      playedAt: item.played_at,
      source: item.source
    }));

    return NextResponse.json({
      items: transformedHistory,
      total: playHistory.length,
      hasMore: playHistory.length === limit
    });

  } catch (error) {
    console.error('API error:', error);
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
    const { trackId, trackName, artistName, albumName, albumCoverUrl, playedAt, source = 'imported' } = body;

    // Validate required fields
    if (!trackId || !trackName || !artistName || !playedAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert new play history entry
    const { data, error } = await supabase
      .from('play_history')
      .insert({
        user_id: user.id,
        track_id: trackId,
        track_name: trackName,
        artist_name: artistName,
        album_name: albumName,
        album_cover_url: albumCoverUrl,
        played_at: playedAt,
        source: source
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save play history' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
