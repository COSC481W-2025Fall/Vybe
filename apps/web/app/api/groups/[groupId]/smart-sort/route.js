import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getTrackMetadata } from '@/lib/services/musicMetadata';
import { analyzeAndSortPlaylists } from '@/lib/services/openaiSorting';
import { updatePlaylistOrder, updateSongOrder } from '@/lib/db/smartSorting';

/**
 * POST /api/groups/[groupId]/smart-sort
 * Triggers AI-powered sorting of playlists and songs in a group
 */
export async function POST(request, { params }) {
  const startTime = Date.now();
  const summary = {
    playlists: 0,
    songs: 0,
    metadataTime: 0,
    aiTime: 0,
    dbTime: 0,
    corrections: 0
  };
  
  console.log('\n========== [SMART SORT] Starting ==========');
  
  try {
    const { groupId } = await params;
    
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a member of the group
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is owner or member
    const { data: membership } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    const isOwner = group.owner_id === session.user.id;
    const isMember = isOwner || membership !== null;

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Fetch all playlists in the group
    console.log('[smart-sort] 📋 Fetching playlists...');
    const { data: playlists, error: playlistsError } = await supabase
      .from('group_playlists')
      .select('*')
      .eq('group_id', groupId);

    if (playlistsError) {
      console.error('[smart-sort] ❌ Error fetching playlists:', playlistsError);
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }

    if (!playlists || playlists.length === 0) {
      console.log('[smart-sort] ⚠️  No playlists found');
      return NextResponse.json({ 
        success: true, 
        message: 'No playlists to sort',
        playlistOrder: [],
        songOrders: {},
      });
    }
    
    console.log(`[smart-sort] ✅ Found ${playlists.length} playlist(s):`);
    playlists.forEach((p, idx) => {
      console.log(`  ${idx + 1}. "${p.name}" (${p.platform}, ID: ${p.id})`);
    });

    // Fetch all songs from all playlists
    console.log('[smart-sort] 🎵 Fetching songs from all playlists...');
    const playlistIds = playlists.map(p => p.id);
    const { data: allSongs, error: songsError } = await supabase
      .from('playlist_songs')
      .select('*')
      .in('playlist_id', playlistIds);

    if (songsError) {
      console.error('[smart-sort] ❌ Error fetching songs:', songsError);
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
    }

    if (!allSongs || allSongs.length === 0) {
      console.log('[smart-sort] ⚠️  No songs found');
      return NextResponse.json({ 
        success: true, 
        message: 'No songs to sort',
        playlistOrder: playlists.map(p => ({ playlistId: p.id, order: 1 })),
        songOrders: {},
      });
    }
    
    console.log(`[smart-sort] ✅ Found ${allSongs.length} total song(s)`);
    
    // Show song count per playlist
    const songsByPlaylistCount = {};
    allSongs.forEach(song => {
      songsByPlaylistCount[song.playlist_id] = (songsByPlaylistCount[song.playlist_id] || 0) + 1;
    });
    playlists.forEach(p => {
      const count = songsByPlaylistCount[p.id] || 0;
      console.log(`  - "${p.name}": ${count} song(s)`);
    });

    // Capture ORIGINAL order before sorting (for comparison)
    console.log('\n[smart-sort] 📸 Capturing original order...');
    const originalPlaylistOrder = playlists
      .map((p, idx) => ({
        playlistId: p.id,
        name: p.name,
        currentOrder: p.smart_sorted_order ?? null,
        fallbackOrder: idx + 1,
      }))
      .sort((a, b) => {
        // Sort by smart_sorted_order if available, otherwise by created_at
        if (a.currentOrder !== null && b.currentOrder !== null) {
          return a.currentOrder - b.currentOrder;
        }
        if (a.currentOrder !== null) return -1;
        if (b.currentOrder !== null) return 1;
        return a.fallbackOrder - b.fallbackOrder;
      });

    const originalSongOrders = {};
    for (const playlist of playlists) {
      const playlistSongs = allSongs.filter(s => s.playlist_id === playlist.id);
      originalSongOrders[playlist.id] = playlistSongs
        .map(song => ({
          songId: song.id,
          title: song.title,
          artist: song.artist || 'Unknown',
          currentOrder: song.smart_sorted_order ?? null,
          position: song.position,
        }))
        .sort((a, b) => {
          if (a.currentOrder !== null && b.currentOrder !== null) {
            return a.currentOrder - b.currentOrder;
          }
          if (a.currentOrder !== null) return -1;
          if (b.currentOrder !== null) return 1;
          return a.position - b.position;
        });
    }

    console.log(`[smart-sort]    - Original playlist order: ${originalPlaylistOrder.length} playlist(s)`);
    originalPlaylistOrder.forEach((po, idx) => {
      const orderLabel = po.currentOrder !== null ? `smart:${po.currentOrder}` : `fallback:${po.fallbackOrder}`;
      console.log(`      ${idx + 1}. "${po.name}" (${orderLabel})`);
    });
    
    const totalOriginalSongs = Object.values(originalSongOrders).reduce((sum, songs) => sum + songs.length, 0);
    console.log(`[smart-sort]    - Original song orders: ${totalOriginalSongs} song(s) across ${Object.keys(originalSongOrders).length} playlist(s)`);

    // Get Spotify tokens for users who added playlists (for Spotify API access)
    console.log('[smart-sort] 🔑 Checking Spotify tokens...');
    const userIds = [...new Set(playlists.map(p => p.added_by))];
    const { data: spotifyTokens } = await supabase
      .from('spotify_tokens')
      .select('user_id, access_token')
      .in('user_id', userIds);

    const tokenMap = {};
    spotifyTokens?.forEach(token => {
      tokenMap[token.user_id] = token.access_token;
    });
    
    const spotifyPlaylists = playlists.filter(p => p.platform === 'spotify');
    const spotifyWithTokens = spotifyPlaylists.filter(p => tokenMap[p.added_by]).length;
    console.log(`[smart-sort] ✅ Spotify tokens: ${spotifyWithTokens}/${spotifyPlaylists.length} playlists have tokens`);

    // Group songs by playlist and fetch metadata
    const songsByPlaylist = {};
    playlists.forEach(playlist => {
      const playlistSongs = allSongs.filter(s => s.playlist_id === playlist.id);
      songsByPlaylist[playlist.id] = playlistSongs;
      
      // Log to verify playlist_id matches
      if (playlistSongs.length > 0) {
        console.log(`[smart-sort] 📋 Playlist "${playlist.name}" (${playlist.id}): ${playlistSongs.length} song(s)`);
        console.log(`[smart-sort]    Sample songs (first 3):`, playlistSongs.slice(0, 3).map(s => ({
          id: s.id,
          title: s.title,
          db_playlist_id: s.playlist_id,
          matches_playlist_id: s.playlist_id === playlist.id
        })));
        
        // Check for mismatches
        const mismatches = playlistSongs.filter(s => s.playlist_id !== playlist.id);
        if (mismatches.length > 0) {
          console.error(`[smart-sort] ❌ CRITICAL: ${mismatches.length} song(s) have mismatched playlist_id!`);
          console.error(`[smart-sort]    Sample mismatches:`, mismatches.slice(0, 3).map(s => ({
            id: s.id,
            title: s.title,
            actual_playlist_id: s.playlist_id,
            expected_playlist_id: playlist.id
          })));
        }
      }
    });

    // Fetch metadata for all songs using batch processing with concurrency control
    console.log(`[smart-sort] Fetching metadata for ${allSongs.length} songs...`);
    const allSongsMetadata = [];

    // Group songs by platform and token for efficient batch processing
    const songsByPlatform = {};
    playlists.forEach(playlist => {
      const key = `${playlist.platform}_${playlist.added_by}`;
      if (!songsByPlatform[key]) {
        songsByPlatform[key] = {
          platform: playlist.platform,
          spotifyToken: tokenMap[playlist.added_by] || null,
          songs: [],
        };
      }
      const songs = songsByPlaylist[playlist.id] || [];
      songs.forEach(song => {
        // CRITICAL: Verify playlist_id matches before adding
        if (song.playlist_id !== playlist.id) {
          console.error(`[smart-sort] ❌ CRITICAL MISMATCH: Song ${song.id} ("${song.title}") has playlist_id=${song.playlist_id}, but playlist.id=${playlist.id}`);
        }
        
        songsByPlatform[key].songs.push({
          ...song,
          playlistId: playlist.id, // Set playlistId to match playlist.id
        });
      });
      
      console.log(`[smart-sort]    Added ${songs.length} song(s) to ${key} group with playlistId=${playlist.id}`);
    });

    // Process each platform group with batch fetching (in parallel for better performance)
    console.log('\n[smart-sort] 📊 Starting metadata fetching phase...');
    console.log(`[smart-sort] Processing ${Object.keys(songsByPlatform).length} platform group(s) in parallel`);
    
    // Process all platform groups concurrently
    const platformPromises = Object.entries(songsByPlatform).map(async ([key, group]) => {
      console.log(`\n[smart-sort] 🔍 Processing ${key}: ${group.songs.length} song(s)`);
      const groupStartTime = Date.now();
      
      try {
        const { getBatchTrackMetadata } = await import('@/lib/services/musicMetadata');
        // Use higher concurrency (5) for better performance
        console.log(`[smart-sort] 🔍 Fetching metadata for ${group.songs.length} songs in ${key} group`);
        console.log(`[smart-sort]    Platform: ${group.platform}`);
        console.log(`[smart-sort]    Spotify token available: ${group.spotifyToken ? '✅ Yes' : '❌ No'}`);
        console.log(`[smart-sort]    Sample songs:`, group.songs.slice(0, 3).map(s => ({ id: s.id, title: s.title, artist: s.artist })));
        
        const metadataStartTime = Date.now();
        const metadata = await getBatchTrackMetadata(
          group.songs,
          group.platform,
          group.spotifyToken,
          { concurrency: 30 } // MAXIMUM CONCURRENCY - increased from 5 to 30
        );
        const metadataTime = ((Date.now() - metadataStartTime) / 1000).toFixed(2);
        console.log(`[smart-sort] ✅ Metadata fetch for ${key} completed in ${metadataTime}s`);
        
        // Count metadata sources
        const sourceCounts = {};
        metadata.forEach(m => {
          m.sources?.forEach(s => {
            sourceCounts[s] = (sourceCounts[s] || 0) + 1;
          });
        });
        
        const groupTime = ((Date.now() - groupStartTime) / 1000).toFixed(2);
        console.log(`[smart-sort] ✅ ${key} completed in ${groupTime}s`);
        console.log(`[smart-sort]    Metadata sources: ${JSON.stringify(sourceCounts)}`);
        
        return metadata;
      } catch (error) {
        const groupTime = ((Date.now() - groupStartTime) / 1000).toFixed(2);
        console.error(`[smart-sort] ❌ Error batch fetching metadata for ${key} (${groupTime}s):`, error.message);
        // Fallback: add basic metadata for all songs in this group
        return group.songs.map(song => ({
          songId: song.id,
          playlistId: song.playlistId,
          title: song.title,
          artist: song.artist || 'Unknown Artist',
          genres: [],
          popularity: 0,
          audioFeatures: {},
          sources: [],
        }));
      }
    });

    // Wait for all platform groups to complete in parallel
    const metadataStartTime = Date.now();
    const allMetadataResults = await Promise.all(platformPromises);
    allMetadataResults.forEach((metadata) => {
      allSongsMetadata.push(...metadata);
    });
    summary.metadataTime = ((Date.now() - metadataStartTime) / 1000).toFixed(2);
    summary.songs = allSongsMetadata.length;

    // Analyze and get optimal ordering using OpenAI
    const aiStartTime = Date.now();
    
    const { playlistOrder, songOrders } = await analyzeAndSortPlaylists(
      groupId,
      playlists,
      allSongsMetadata
    );
    
    summary.aiTime = ((Date.now() - aiStartTime) / 1000).toFixed(2);
    summary.playlists = playlists.length;
    console.log(`[smart-sort]    - Playlist order: ${playlistOrder.length} playlist(s)`);
    console.log(`[smart-sort]    - Song orders: ${Object.keys(songOrders).length} playlist(s)`);
    
    // CRITICAL FIX: OpenAI sometimes returns song titles instead of song IDs
    console.log(`[smart-sort] 🔧 Building title-to-ID mapping for ${allSongsMetadata.length} songs...`);
    const titleToSongIdMap = new Map(); // title+artist -> songId
    const titleOnlyToSongIdMap = new Map(); // title only -> songId (for cases with multiple matches, use first)
    const songIdToMetadataMap = new Map();
    
    allSongsMetadata.forEach((song, idx) => {
      const titleKey = song.title.toLowerCase().trim();
      const fullKey = `${titleKey}|||${(song.artist || '').toLowerCase().trim()}`;
      titleToSongIdMap.set(fullKey, song.songId);
      // For title-only map, only set if not already set (to avoid overwriting)
      if (!titleOnlyToSongIdMap.has(titleKey)) {
        titleOnlyToSongIdMap.set(titleKey, song.songId);
      } else {
        console.warn(`[smart-sort] ⚠️  Duplicate title "${song.title}" found, keeping first mapping`);
      }
      songIdToMetadataMap.set(song.songId, song);
      
      // Log first 5 mappings
      if (idx < 5) {
        console.log(`[smart-sort]    Mapping ${idx + 1}: "${song.title}" by ${song.artist || 'Unknown'} → ${song.songId}`);
      }
    });
    
    console.log(`[smart-sort] ✅ Built mappings: ${titleToSongIdMap.size} title+artist keys, ${titleOnlyToSongIdMap.size} title-only keys, ${songIdToMetadataMap.size} song IDs`);
    
    // Validate and fix songOrders - convert titles to IDs if needed
    let fixedSongCount = 0;
    let skippedSongCount = 0;
    const validatedSongOrders = {};
    
    for (const [playlistId, songOrder] of Object.entries(songOrders)) {
      validatedSongOrders[playlistId] = [];
      
      for (const songEntry of songOrder) {
        let songId = songEntry.songId;
        const order = songEntry.order;
        
        // Check if songId is actually a UUID (valid UUID format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUuid = uuidRegex.test(String(songId));
        
        if (!isValidUuid) {
          // This is likely a title, try to find the actual songId
          const searchKey = String(songId).toLowerCase().trim();
          let foundId = null;
          
          // Strategy 1: Try exact title match (title-only)
          if (titleOnlyToSongIdMap.has(searchKey)) {
            foundId = titleOnlyToSongIdMap.get(searchKey);
          }
          
          // Strategy 2: Try title+artist match (more precise)
          if (!foundId) {
            // Check if the searchKey might contain artist info
            for (const [key, id] of titleToSongIdMap.entries()) {
              const [title, artist] = key.split('|||');
              if (title === searchKey || key === searchKey) {
                foundId = id;
                break;
              }
            }
          }
          
          // Strategy 3: Try partial/fuzzy match (fallback)
          if (!foundId) {
            for (const [key, id] of titleToSongIdMap.entries()) {
              const [title] = key.split('|||');
              // Check if searchKey is contained in title or vice versa
              if (title.includes(searchKey) || searchKey.includes(title)) {
                foundId = id;
                break;
              }
            }
          }
          
          if (foundId) {
            console.log(`[smart-sort] 🔧 Fixed song ID: "${songId}" → ${foundId}`);
            songId = foundId;
            fixedSongCount++;
          } else {
            console.warn(`[smart-sort] ⚠️  Could not find song ID for title: "${songId}" (skipping)`);
            skippedSongCount++;
            // Skip this song - we can't update it without a valid ID
            continue;
          }
        }
        
        // Verify the songId exists in our metadata
        if (!songIdToMetadataMap.has(songId)) {
          console.warn(`[smart-sort] ⚠️  Song ID ${songId} not found in metadata, skipping`);
          skippedSongCount++;
          continue;
        }
        
        validatedSongOrders[playlistId].push({ songId, order });
      }
    }
    
    if (fixedSongCount > 0) {
      console.log(`[smart-sort] 🔧 Fixed ${fixedSongCount} song ID(s) that were returned as titles`);
    }
    if (skippedSongCount > 0) {
      console.warn(`[smart-sort] ⚠️  Skipped ${skippedSongCount} song(s) that could not be mapped to valid IDs`);
    }
    
    // Replace songOrders with validated version
    Object.keys(songOrders).forEach(playlistId => {
      songOrders[playlistId] = validatedSongOrders[playlistId] || [];
    });
    
    // CRITICAL: Log what we're about to send to updateSongOrder
    console.log(`[smart-sort] 📋 Final songOrders to update:`);
    Object.entries(songOrders).forEach(([playlistId, songs]) => {
      console.log(`[smart-sort]    Playlist ${playlistId}: ${songs.length} song(s)`);
      console.log(`[smart-sort]    First 3 songs:`, songs.slice(0, 3).map(s => ({ songId: s.songId, order: s.order })));
      
      // Verify these songIds actually exist in this playlist in the database
      const songIds = songs.map(s => s.songId);
      console.log(`[smart-sort]    Verifying ${songIds.length} song IDs exist in playlist ${playlistId}...`);
    });
    
    // Show NEW playlist order
    console.log('\n[smart-sort] 📋 NEW Playlist order from AI:');
    playlistOrder.forEach((po) => {
      const playlist = playlists.find(p => p.id === po.playlistId);
      console.log(`  Order ${po.order}: "${playlist?.name || 'Unknown'}" (${playlist?.platform}, ID: ${po.playlistId})`);
    });
    
    // Also show song order summary
    console.log('\n[smart-sort] 🎵 NEW Song orders from AI:');
    for (const [playlistId, songOrder] of Object.entries(songOrders)) {
      const playlist = playlists.find(p => p.id === playlistId);
      console.log(`  "${playlist?.name}": ${songOrder.length} song(s) with orders ${songOrder[0]?.order} to ${songOrder[songOrder.length - 1]?.order}`);
    }

    // COMPARE original vs new order
    console.log('\n[smart-sort] 🔍 COMPARING ORIGINAL vs NEW ORDER:');
    
    // Compare playlist order - compare actual order values AND sequence
    console.log('\n[smart-sort] 📊 Playlist Order Comparison:');
    let playlistOrderChanged = false;
    let sequenceChanged = false;
    
    // Create a map of original order values by playlistId
    const originalPlaylistOrderMap = {};
    originalPlaylistOrder.forEach((po, idx) => {
      originalPlaylistOrderMap[po.playlistId] = {
        name: po.name,
        order: po.currentOrder !== null ? po.currentOrder : po.fallbackOrder,
        wasSorted: po.currentOrder !== null,
        originalIndex: idx,
      };
    });
    
    // Check if sequence changed (even if order numbers are the same)
    const originalSequence = originalPlaylistOrder.map(po => po.playlistId);
    const newSequence = playlistOrder.map(po => po.playlistId);
    sequenceChanged = JSON.stringify(originalSequence) !== JSON.stringify(newSequence);
    
    playlistOrder.forEach((newOrder, newIdx) => {
      const original = originalPlaylistOrderMap[newOrder.playlistId];
      if (!original) {
        console.log(`  ⚠️  "${newOrder.playlistId}": Not found in original order`);
        playlistOrderChanged = true;
        return;
      }
      
      // Compare actual order values AND position in sequence
      const orderChanged = original.order !== newOrder.order;
      const positionChanged = original.originalIndex !== newIdx;
      const changed = orderChanged || positionChanged;
      
      if (changed) playlistOrderChanged = true;
      
      const changeIndicator = changed ? '🔄' : '➡️';
      const originalLabel = original.wasSorted ? `smart:${original.order}` : `fallback:${original.order}`;
      const newLabel = `smart:${newOrder.order}`;
      const changeDetails = [];
      if (orderChanged) changeDetails.push('order value changed');
      if (positionChanged) changeDetails.push('position in sequence changed');
      const changeText = changed ? ` (${changeDetails.join(', ')})` : '';
      console.log(`  ${changeIndicator} "${original.name}": ${originalLabel} → ${newLabel}${changeText}`);
    });
    
    if (!playlistOrderChanged && playlists.length > 1) {
      console.log('  ⚠️  WARNING: Playlist order did not change!');
      if (!sequenceChanged) {
        console.log('  ⚠️  WARNING: Playlist sequence is identical to original!');
      }
    } else if (playlists.length === 1) {
      console.log('  ℹ️  Only one playlist - order unchanged (expected)');
    }

    // Compare song orders - compare actual order values AND sequence
    console.log('\n[smart-sort] 🎵 Song Order Comparison:');
    let totalSongChanges = 0;
    
    for (const [playlistId, newSongOrder] of Object.entries(songOrders)) {
      const playlist = playlists.find(p => p.id === playlistId);
      const originalSongs = originalSongOrders[playlistId] || [];
      
      if (originalSongs.length === 0) {
        console.log(`  ⚠️  "${playlist?.name}": No original songs to compare`);
        continue;
      }

      // Create a map of original order values by songId
      const originalSongOrderMap = {};
      originalSongs.forEach((song, idx) => {
        originalSongOrderMap[song.songId] = {
          title: song.title,
          artist: song.artist,
          order: song.currentOrder !== null ? song.currentOrder : song.position,
          wasSorted: song.currentOrder !== null,
          originalIndex: idx,
        };
      });

      // Check if sequence changed
      const originalSequence = originalSongs.map(s => s.songId);
      const newSequence = newSongOrder.map(s => s.songId);
      const sequenceChanged = JSON.stringify(originalSequence) !== JSON.stringify(newSequence);

      let playlistSongChanges = 0;
      const changes = [];
      
      newSongOrder.forEach((newOrder, newIdx) => {
        const original = originalSongOrderMap[newOrder.songId];
        if (!original) {
          changes.push(`    ⚠️  Song ${newOrder.songId} not found in original order`);
          playlistSongChanges++;
          totalSongChanges++;
          return;
        }
        
        // Compare actual order values AND position in sequence
        const orderChanged = original.order !== newOrder.order;
        const positionChanged = original.originalIndex !== newIdx;
        const changed = orderChanged || positionChanged;
        
        if (changed) {
          playlistSongChanges++;
          totalSongChanges++;
          const originalLabel = original.wasSorted ? `smart:${original.order}` : `position:${original.order}`;
          const newLabel = `smart:${newOrder.order}`;
          const changeDetails = [];
          if (orderChanged) changeDetails.push('order value changed');
          if (positionChanged) changeDetails.push('position changed');
          const changeText = changeDetails.length > 0 ? ` (${changeDetails.join(', ')})` : '';
          changes.push(`    🔄 "${original.title}" by ${original.artist}: ${originalLabel} → ${newLabel}${changeText}`);
        }
      });

      if (playlistSongChanges > 0) {
        console.log(`  📋 "${playlist?.name}": ${playlistSongChanges} song(s) moved`);
        changes.slice(0, 10).forEach(change => console.log(change)); // Show first 10 changes
        if (changes.length > 10) {
          console.log(`    ... and ${changes.length - 10} more change(s)`);
        }
      } else {
        console.log(`  ➡️  "${playlist?.name}": No song order changes`);
        if (sequenceChanged) {
          console.log(`    ⚠️  WARNING: Sequence changed but order values are the same!`);
        }
      }
    }

    if (totalSongChanges === 0 && !playlistOrderChanged) {
      console.log('\n  ⚠️  WARNING: No changes detected! The order appears to be the same.');
    } else {
      console.log(`\n  ✅ Total changes: ${playlistOrderChanged ? 'Playlist order changed' : 'Playlist order unchanged'}, ${totalSongChanges} song(s) moved`);
    }

    // Get first playlist ID for verification (used in multiple places)
    const firstPlaylistId = playlistOrder[0]?.playlistId;
    
    // Check database state BEFORE update
    console.log('\n[smart-sort] 🔍 Checking database state BEFORE update...');
    const { data: beforePlaylists } = await supabase
      .from('group_playlists')
      .select('id, name, smart_sorted_order, last_sorted_at')
      .eq('group_id', groupId);
    
    console.log(`[smart-sort]    Current playlist state:`);
    beforePlaylists?.forEach(p => {
      console.log(`      - "${p.name}" (${p.id}): smart_sorted_order = ${p.smart_sorted_order ?? 'null'}, last_sorted_at = ${p.last_sorted_at ?? 'null'}`);
    });
    if (firstPlaylistId) {
      const { data: beforeSongs } = await supabase
        .from('playlist_songs')
        .select('id, title, smart_sorted_order, position')
        .eq('playlist_id', firstPlaylistId)
        .limit(5);
      
      console.log(`[smart-sort]    Current song state (first 5 songs in playlist ${firstPlaylistId}):`);
      beforeSongs?.forEach(s => {
        console.log(`      - "${s.title}": smart_sorted_order = ${s.smart_sorted_order ?? 'null'}, position = ${s.position}`);
      });
    }

    // Update database with new ordering
    console.log('\n[smart-sort] 💾 Updating database...');
    const dbStartTime = Date.now();
    await updatePlaylistOrder(supabase, groupId, playlistOrder);
    console.log(`[smart-sort]    ✅ Updated ${playlistOrder.length} playlist order(s)`);
    
    const totalSongsToUpdate = Object.values(songOrders).reduce((sum, orders) => sum + orders.length, 0);
    await updateSongOrder(supabase, songOrders);
    console.log(`[smart-sort]    ✅ Updated ${totalSongsToUpdate} song order(s)`);
    
    summary.dbTime = ((Date.now() - dbStartTime) / 1000).toFixed(2);

    // VERIFY: Fetch the order back from database to confirm it was saved
    console.log('\n[smart-sort] ✅ VERIFYING database update...');
    const { data: verifyPlaylists, error: verifyPlaylistsError } = await supabase
      .from('group_playlists')
      .select('id, name, smart_sorted_order, last_sorted_at')
      .eq('group_id', groupId)
      .order('smart_sorted_order', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: true });

    if (verifyPlaylistsError) {
      console.error('[smart-sort] ❌ Error verifying playlist order:', verifyPlaylistsError);
    } else {
      console.log(`[smart-sort]    Verified ${verifyPlaylists.length} playlist(s) in database:`);
      verifyPlaylists.forEach((p, idx) => {
        const orderLabel = p.smart_sorted_order !== null ? `smart:${p.smart_sorted_order}` : 'null';
        console.log(`      ${idx + 1}. "${p.name}" (ID: ${p.id}): smart_sorted_order = ${orderLabel}, last_sorted_at = ${p.last_sorted_at ?? 'null'}`);
      });
      
      // Compare with expected order
      const mismatches = playlistOrder.filter(po => {
        const dbPlaylist = verifyPlaylists.find(p => p.id === po.playlistId);
        return !dbPlaylist || dbPlaylist.smart_sorted_order !== po.order;
      });
      
      if (mismatches.length > 0) {
        console.error(`[smart-sort] ⚠️  WARNING: ${mismatches.length} playlist(s) have mismatched order values!`);
        mismatches.forEach(m => {
          const dbPlaylist = verifyPlaylists.find(p => p.id === m.playlistId);
          console.error(`      - Expected playlist ${m.playlistId} to have order ${m.order}, but got ${dbPlaylist?.smart_sorted_order ?? 'null'}`);
        });
      } else {
        console.log(`[smart-sort]    ✅ All playlist orders match expected values`);
      }
    }

    // Verify song orders for first playlist (to avoid too much output)
    // firstPlaylistId already defined above
    if (firstPlaylistId) {
      const { data: verifySongs, error: verifySongsError } = await supabase
        .from('playlist_songs')
        .select('id, title, smart_sorted_order, position')
        .eq('playlist_id', firstPlaylistId)
        .order('smart_sorted_order', { ascending: true, nullsLast: false })
        .order('position', { ascending: true })
        .limit(10); // Just check first 10

      if (verifySongsError) {
        console.error('[smart-sort] ❌ Error verifying song order:', verifySongsError);
      } else {
        const playlist = playlists.find(p => p.id === firstPlaylistId);
        console.log(`[smart-sort]    Verified first 10 song(s) in "${playlist?.name}":`);
        verifySongs.forEach((s, idx) => {
          const orderLabel = s.smart_sorted_order !== null ? `smart:${s.smart_sorted_order}` : `position:${s.position}`;
          console.log(`      ${idx + 1}. "${s.title}" (${orderLabel})`);
        });
        
        // Check if smart_sorted_order was actually set
        const songsWithSmartOrder = verifySongs.filter(s => s.smart_sorted_order !== null).length;
        if (songsWithSmartOrder === 0) {
          console.error('[smart-sort] ⚠️  WARNING: No songs have smart_sorted_order set! Database update may have failed.');
        } else {
          console.log(`[smart-sort]    ✅ ${songsWithSmartOrder}/${verifySongs.length} songs have smart_sorted_order set`);
        }
        
        // Compare with expected order and fix mismatches for ALL playlists
        let totalMismatches = 0;
        let totalCorrected = 0;
        
        for (const [playlistId, expectedSongs] of Object.entries(songOrders)) {
          const { data: allVerifySongs } = await supabase
            .from('playlist_songs')
            .select('id, smart_sorted_order')
            .eq('playlist_id', playlistId);
          
          const mismatches = expectedSongs.filter(es => {
            const dbSong = allVerifySongs?.find(s => s.id === es.songId);
            return !dbSong || dbSong.smart_sorted_order !== es.order;
          });
          
          if (mismatches.length > 0) {
            totalMismatches += mismatches.length;
            
            // Correct mismatches
            const corrections = mismatches.map(m => 
              supabase
                .from('playlist_songs')
                .update({ smart_sorted_order: m.order })
                .eq('id', m.songId)
                .eq('playlist_id', playlistId)
                .select('id, smart_sorted_order')
            );
            
            const correctionResults = await Promise.allSettled(corrections);
            const corrected = correctionResults.filter(r => 
              r.status === 'fulfilled' && r.value.data && r.value.data.length > 0
            ).length;
            
            totalCorrected += corrected;
          }
        }
        
        if (totalMismatches > 0) {
          console.log(`[smart-sort]    ✅ Corrected ${totalCorrected}/${totalMismatches} mismatched song(s)`);
          summary.corrections = totalCorrected;
        } else {
          console.log(`[smart-sort]    ✅ All song orders match expected values`);
        }
      }
    }
    
    // Provide SQL queries for manual verification
    console.log('\n[smart-sort] 📊 SQL QUERIES FOR MANUAL VERIFICATION:');
    console.log(`[smart-sort]    Run these in Supabase SQL Editor to check database state:`);
    console.log(`[smart-sort]    `);
    console.log(`[smart-sort]    -- Check playlist orders:`);
    console.log(`[smart-sort]    SELECT id, name, smart_sorted_order, last_sorted_at`);
    console.log(`[smart-sort]    FROM group_playlists`);
    console.log(`[smart-sort]    WHERE group_id = '${groupId}'`);
    console.log(`[smart-sort]    ORDER BY smart_sorted_order ASC NULLS LAST, created_at ASC;`);
    console.log(`[smart-sort]    `);
    if (firstPlaylistId) {
      console.log(`[smart-sort]    -- Check song orders for first playlist:`);
      console.log(`[smart-sort]    SELECT id, title, artist, smart_sorted_order, position`);
      console.log(`[smart-sort]    FROM playlist_songs`);
      console.log(`[smart-sort]    WHERE playlist_id = '${firstPlaylistId}'`);
      console.log(`[smart-sort]    ORDER BY smart_sorted_order ASC NULLS LAST, position ASC`);
      console.log(`[smart-sort]    LIMIT 20;`);
      console.log(`[smart-sort]    `);
      console.log(`[smart-sort]    -- Count songs with smart_sorted_order set:`);
      console.log(`[smart-sort]    SELECT`);
      console.log(`[smart-sort]      COUNT(*) FILTER (WHERE smart_sorted_order IS NOT NULL) as with_smart_order,`);
      console.log(`[smart-sort]      COUNT(*) FILTER (WHERE smart_sorted_order IS NULL) as without_smart_order,`);
      console.log(`[smart-sort]      COUNT(*) as total`);
      console.log(`[smart-sort]    FROM playlist_songs`);
      console.log(`[smart-sort]    WHERE playlist_id = '${firstPlaylistId}';`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Final summary
    console.log('\n========== [SMART SORT] Summary ==========');
    console.log(`✅ Completed in ${totalTime}s`);
    console.log(`   Playlists: ${summary.playlists}`);
    console.log(`   Songs: ${summary.songs}`);
    console.log(`   Metadata: ${summary.metadataTime}s`);
    console.log(`   AI Analysis: ${summary.aiTime}s`);
    console.log(`   Database: ${summary.dbTime}s`);
    if (summary.corrections > 0) {
      console.log(`   Corrections: ${summary.corrections} song(s) fixed`);
    }
    console.log('==========================================\n');

    return NextResponse.json({
      success: true,
      message: 'Playlists and songs sorted successfully',
      playlistOrder,
      songOrders,
      songsProcessed: allSongsMetadata.length,
    });

  } catch (error) {
    console.error('[smart-sort] Error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to sort playlists';
    let statusCode = 500;
    
    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing and plan settings.';
      statusCode = 402; // Payment Required
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit reached. Please try again in a few moments.';
      statusCode = 429; // Too Many Requests
    } else if (error.message?.includes('Unauthorized')) {
      errorMessage = 'You are not authorized to sort this group.';
      statusCode = 401;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: error.message,
      },
      { status: statusCode }
    );
  }
}

