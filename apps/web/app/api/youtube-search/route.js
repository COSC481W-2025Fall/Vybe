// app/api/youtube-search/route.js
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
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Check if YOUTUBE_API_KEY is configured
    const apiKey = process.env.YOUTUBE_API_KEY;

    console.log('[youtube-search] Query:', query);
    console.log('[youtube-search] API Key configured:', !!apiKey);

    if (!apiKey) {
      console.error('[youtube-search] YOUTUBE_API_KEY not configured');
      // Return search URL as fallback
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return NextResponse.json({
        videoUrl: searchUrl,
        fallback: true,
        reason: 'No API key configured'
      });
    }

    // Search YouTube for the video using API key
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`;
    console.log('[youtube-search] Calling YouTube API...');

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[youtube-search] API error:', response.status, errorText);
      // Fallback to search URL
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return NextResponse.json({
        videoUrl: searchUrl,
        fallback: true,
        reason: `API error: ${response.status}`
      });
    }

    const data = await response.json();
    console.log('[youtube-search] API response:', JSON.stringify(data, null, 2));

    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log('[youtube-search] Found video:', videoUrl);

      return NextResponse.json({
        videoUrl,
        videoId,
        title: data.items[0].snippet.title,
        fallback: false
      });
    } else {
      console.log('[youtube-search] No results found');
      // No results found, return search URL
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return NextResponse.json({
        videoUrl: searchUrl,
        fallback: true,
        reason: 'No results found'
      });
    }

  } catch (error) {
    console.error('YouTube search error:', error);
    const query = new URL(request.url).searchParams.get('q');
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    return NextResponse.json({
      videoUrl: searchUrl,
      fallback: true
    });
  }
}
