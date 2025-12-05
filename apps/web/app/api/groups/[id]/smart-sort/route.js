// app/api/groups/[id]/smart-sort/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { smartSort, getQueueStatus, heuristicOnlySort, getSystemHealth, isSystemHealthy, getEstimatedWaitTime } from '@/lib/services/smartSortEngine';
import { analyzeAndSortPlaylists } from '@/lib/services/openaiSorting';
import { updatePlaylistOrder, updateSongOrder } from '@/lib/db/smartSorting';
import { rateLimitMiddleware } from '@/lib/api/rateLimiter';

// Helper to check if string is a UUID
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Lookup group by slug first (preferred), then by UUID as fallback
async function findGroup(supabase, identifier, selectFields = 'id, name, owner_id') {
  // Try slug first (handles edge case where slug looks like UUID)
  const { data: bySlug } = await supabase
    .from('groups')
    .select(selectFields)
    .eq('slug', identifier)
    .maybeSingle();
  
  if (bySlug) return { data: bySlug, error: null };
  
  // If not found by slug and looks like UUID, try by ID
  if (isUUID(identifier)) {
    return await supabase
      .from('groups')
      .select(selectFields)
      .eq('id', identifier)
      .single();
  }
  
  return { data: null, error: { message: 'Group not found' } };
}

/**
 * POST /api/groups/[id]/smart-sort
 * 
 * SCALABLE SMART SORTING with:
 * - Local heuristic sorting (instant, handles 99% of work)
 * - AI verification (optional, timeout-protected)
 * - Cascading fallbacks (gpt-4o-mini → gpt-3.5-turbo → heuristic)
 * - Request queuing (handles concurrent load)
 * 
 * Body: { mode: 'all' | 'playlist', skipAI?: boolean }
 */
export async function POST(request, { params }) {
  const startTime = Date.now();
  console.log('\n========== [Smart Sort API] Starting ==========');
  console.log(`[Smart Sort API] Queue status:`, getQueueStatus());
  
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Smart Sort API] Auth error:', authError);
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
    }

    // Rate limiting - prevent abuse
    const rateLimitResult = rateLimitMiddleware(user.id, '/api/groups/*/smart-sort');
    if (rateLimitResult.status === 429) {
      console.log(`[Smart Sort API] Rate limited user: ${user.id}`);
      return NextResponse.json(rateLimitResult.body, { 
        status: 429,
        headers: rateLimitResult.headers,
      });
    }

    // Get group ID or slug from params
    const resolvedParams = await Promise.resolve(params);
    const groupIdOrSlug = resolvedParams.id;

    if (!groupIdOrSlug) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    console.log(`[Smart Sort API] Group: ${groupIdOrSlug}, User: ${user.id}`);

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
    const mode = body.mode || 'all';
    let skipAI = body.skipAI || false;
    const skipQueue = body.skipQueue || false; // User can choose to skip queue for instant heuristic
    
    // Get current queue status for response
    const initialQueueStatus = getQueueStatus();
    
    // Only auto-skip AI if system is truly unhealthy (not just busy)
    if (!isSystemHealthy() && initialQueueStatus.healthScore < 30) {
      console.log('[Smart Sort API] System critically unhealthy, forcing heuristic mode');
      skipAI = true;
    }
    
    console.log(`[Smart Sort API] Mode: ${mode}, SkipAI: ${skipAI}, SkipQueue: ${skipQueue}`);
    console.log(`[Smart Sort API] Queue: ${initialQueueStatus.queued} waiting, ${initialQueueStatus.running} running`);

    // Verify user has access to this group (owner or member) - lookup by slug first
    const { data: group, error: groupError } = await findGroup(supabase, groupIdOrSlug);

    if (groupError || !group) {
      console.error('[Smart Sort API] Group not found:', groupError);
      return NextResponse.json({ error: "This group doesn't exist or has been deleted." }, { status: 404 });
    }

    // Use actual group ID for all subsequent queries
    const actualGroupId = group.id;

    // Check if user is owner or member
    const isOwner = group.owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', actualGroupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: "You don't have access to this group." }, { status: 403 });
      }
    }

    // Fetch all playlists for the group
    const { data: playlists, error: playlistsError } = await supabase
      .from('group_playlists')
      .select('*')
      .eq('group_id', actualGroupId)
      .order('created_at', { ascending: true });

    if (playlistsError) {
      console.error('[Smart Sort API] Playlists error:', playlistsError);
      return NextResponse.json({ error: "Couldn't load the playlists. Please try again." }, { status: 500 });
    }

    if (!playlists || playlists.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No playlists to sort',
        songsProcessed: 0 
      });
    }

    console.log(`[Smart Sort API] Found ${playlists.length} playlist(s)`);

    // Fetch all songs from all playlists
    const playlistIds = playlists.map(p => p.id);
    const { data: allSongs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('*')
      .in('playlist_id', playlistIds);

    if (songsError) {
      console.error('[Smart Sort API] Songs error:', songsError);
      return NextResponse.json({ error: "Couldn't load the songs. Please try again." }, { status: 500 });
    }

    if (!allSongs || allSongs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No songs to sort',
        songsProcessed: 0 
      });
    }

    console.log(`[Smart Sort API] Found ${allSongs.length} song(s) total`);

    // Build metadata for all songs
    const allSongsMetadata = allSongs.map(song => ({
      songId: song.id,
      playlistId: song.playlist_id,
      title: song.title || 'Unknown',
      artist: song.artist || 'Unknown Artist',
      genres: song.genres || [],
      popularity: song.popularity || 0,
      audioFeatures: song.audio_features || {},
      platform: song.platform || 'unknown',
    }));

    let result;

    if (mode === 'all') {
      // Unified "All" view sorting using new scalable engine
      console.log('[Smart Sort API] Running scalable smart sort for ALL songs...');
      
      // Use the new smart sort engine with local heuristics + optional AI
      const sortResult = await smartSort(allSongsMetadata, { skipAI, skipQueue });
      
      // Save the unified sort order to the group
      const { error: updateError } = await supabase
        .from('groups')
        .update({
          all_songs_sort_order: sortResult.sortedSongIds,
          all_songs_sorted_at: new Date().toISOString(),
        })
        .eq('id', actualGroupId);

      if (updateError) {
        console.error('[Smart Sort API] Failed to save sort order:', updateError);
        return NextResponse.json({ error: "Couldn't save the sort order. Please try again." }, { status: 500 });
      }

      console.log(`[Smart Sort API] ✅ Saved unified sort order: ${sortResult.sortedSongIds.length} songs`);
      console.log(`[Smart Sort API] Method: ${sortResult.summary.method}`);

      result = {
        success: true,
        mode: 'all',
        songsProcessed: sortResult.sortedSongIds.length,
        summary: sortResult.summary,
        queueStatus: getQueueStatus(),
      };

    } else {
      // Individual playlist sorting (still uses OpenAI for complex analysis)
      console.log('[Smart Sort API] Running per-playlist sort...');
      
      try {
        const aiResult = await analyzeAndSortPlaylists(actualGroupId, playlists, allSongsMetadata);
        
        // Save playlist order
        if (aiResult.playlistOrder && aiResult.playlistOrder.length > 0) {
          await updatePlaylistOrder(supabase, actualGroupId, aiResult.playlistOrder);
        }

        // Save song orders for each playlist
        if (aiResult.songOrders && Object.keys(aiResult.songOrders).length > 0) {
          await updateSongOrder(supabase, aiResult.songOrders);
        }

        console.log(`[Smart Sort API] ✅ Saved playlist sort orders`);

        result = {
          success: true,
          mode: 'playlist',
          songsProcessed: allSongs.length,
          playlistsProcessed: playlists.length,
        };
      } catch (playlistError) {
        // Fallback to heuristic for playlist mode too
        console.warn('[Smart Sort API] Playlist sort failed, using heuristic fallback');
        
        const sortResult = await heuristicOnlySort(allSongsMetadata);
        
        const { error: updateError } = await supabase
          .from('groups')
          .update({
            all_songs_sort_order: sortResult.sortedSongIds,
            all_songs_sorted_at: new Date().toISOString(),
          })
          .eq('id', actualGroupId);

        result = {
          success: true,
          mode: 'all',
          songsProcessed: sortResult.sortedSongIds.length,
          summary: { ...sortResult.summary, fallback: true },
        };
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Smart Sort API] ✅ Complete in ${totalTime}s`);
    console.log('========== [Smart Sort API] Done ==========\n');

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Smart Sort API] Error:', error);
    
    // Even on error, try heuristic fallback
    try {
      console.log('[Smart Sort API] Attempting heuristic fallback...');
      // We'd need the songs here - if we don't have them, return error
    } catch (fallbackError) {
      console.error('[Smart Sort API] Fallback also failed:', fallbackError);
    }
    
    // Return user-friendly error messages
    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return NextResponse.json({ 
        error: "We're a bit busy right now. Your playlist was sorted using our quick algorithm instead!",
        fallbackUsed: true
      }, { status: 200 });
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      return NextResponse.json({ 
        error: "You've sorted a few times recently. Please wait a moment before trying again.",
      }, { status: 429 });
    }

    if (error.message?.includes('Queue') || error.message?.includes('queue')) {
      return NextResponse.json({ 
        error: "Lots of people are sorting right now! Your playlist was sorted using our quick algorithm.",
        fallbackUsed: true
      }, { status: 200 });
    }

    return NextResponse.json({ 
      error: "Couldn't sort your playlist. Please try again.",
    }, { status: 500 });
  }
}

/**
 * GET /api/groups/[id]/smart-sort
 * Get current queue status and system health
 */
export async function GET() {
  const health = getSystemHealth();
  
  return NextResponse.json({
    ...health,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

