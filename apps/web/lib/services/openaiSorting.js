/**
 * OpenAI Sorting Service
 * Uses OpenAI to analyze music metadata and determine optimal ordering
 * for playlists and songs based on genres, artists, and popularity
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze and sort playlists and songs within a group
 * @param {string} groupId - Group ID
 * @param {Array} playlists - Array of playlist objects with metadata
 * @param {Array} allSongsMetadata - Array of song metadata objects from all playlists
 * @returns {Promise<Object>} Object with playlistOrder and songOrder arrays
 */
export async function analyzeAndSortPlaylists(groupId, playlists, allSongsMetadata) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  if (playlists.length === 0) {
    return { playlistOrder: [], songOrder: [] };
  }

  // Group songs by playlist
  const songsByPlaylist = {};
  allSongsMetadata.forEach(songMeta => {
    if (!songsByPlaylist[songMeta.playlistId]) {
      songsByPlaylist[songMeta.playlistId] = [];
    }
    songsByPlaylist[songMeta.playlistId].push(songMeta);
  });

  // Build prompt for OpenAI
  const playlistDescriptions = playlists.map(playlist => {
    const songs = songsByPlaylist[playlist.id] || [];
    const genres = new Set();
    const artists = new Set();
    let totalPopularity = 0;
    let songCount = 0;

    songs.forEach(song => {
      song.genres?.forEach(g => genres.add(g));
      if (song.artist) artists.add(song.artist);
      if (song.popularity) {
        totalPopularity += song.popularity;
        songCount++;
      }
    });

    const avgPopularity = songCount > 0 ? totalPopularity / songCount : 0;

    return {
      id: playlist.id,
      name: playlist.name,
      platform: playlist.platform,
      songCount: songs.length,
      genres: Array.from(genres).slice(0, 10),
      artists: Array.from(artists).slice(0, 10),
      avgPopularity: Math.round(avgPopularity),
    };
  });

  // Build detailed song information with metadata sources
  console.log(`[openaiSorting] 📝 Building detailed song information for ${playlists.length} playlist(s)...`);
  const detailedSongs = playlists.map(playlist => {
    const songs = songsByPlaylist[playlist.id] || [];
    console.log(`[openaiSorting]    Playlist "${playlist.name}" (${playlist.id}): ${songs.length} song(s)`);
    
    const songData = songs.map(s => {
      const songInfo = {
        songId: s.songId,
        title: s.title,
        artist: s.artist,
        genres: s.genres || [],
        popularity: s.popularity || 0, // Spotify popularity (0-100) or Last.fm play count
        lastFmPlayCount: s.lastFmPlayCount || null, // Last.fm play count for relatability analysis
        audioFeatures: s.audioFeatures || {},
        metadataSources: s.sources || [], // Shows which APIs provided data (spotify, lastfm, musicbrainz)
      };
      
      // Validate songId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(String(s.songId));
      
      if (!isValidUuid) {
        console.error(`[openaiSorting] ❌ CRITICAL: Song "${s.title}" has invalid songId: "${s.songId}" (not a UUID!)`);
      } else {
        console.log(`[openaiSorting]    ✅ Song "${s.title}": songId=${s.songId} (valid UUID)`);
      }
      
      return songInfo;
    });
    
    // Log sample of first 3 songs
    if (songData.length > 0) {
      console.log(`[openaiSorting]    Sample songs (first 3):`, songData.slice(0, 3).map(s => ({
        songId: s.songId,
        title: s.title,
        artist: s.artist,
        isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s.songId))
      })));
    }
    
    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      songs: songData
    };
  });
  
  console.log(`[openaiSorting] ✅ Built detailed song information: ${detailedSongs.reduce((sum, p) => sum + p.songs.length, 0)} total songs`);

  // Calculate frequency statistics for genres, artists, and albums
  const genreFrequency = {};
  const artistFrequency = {};
  const albumFrequency = {};
  
  allSongsMetadata.forEach(song => {
    // Count genre frequencies
    if (song.genres && Array.isArray(song.genres)) {
      song.genres.forEach(genre => {
        genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
      });
    }
    // Count artist frequencies
    if (song.artist) {
      artistFrequency[song.artist] = (artistFrequency[song.artist] || 0) + 1;
    }
    // Count album frequencies (if available)
    if (song.album) {
      albumFrequency[song.album] = (albumFrequency[song.album] || 0) + 1;
    }
  });

  // Get top genres, artists, albums
  const topGenres = Object.entries(genreFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));
  
  const topArtists = Object.entries(artistFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }));

  const prompt = `You are an expert music playlist curator. Analyze the following playlists and their songs using data from multiple music databases (Spotify, Last.fm, MusicBrainz, Billboard), then provide an optimal ordering that creates a smooth, engaging listening experience based on FREQUENCY CLUSTERING.

CRITICAL ORDERING STRATEGY - FREQUENCY-BASED CLUSTERING:
1. **Genre Frequency Clustering** (HIGHEST PRIORITY):
   - Analyze the frequency of each genre in the playlist
   - Group songs by MOST FREQUENT genres first (these are the dominant themes)
   - Create clusters: Most frequent genres → Less frequent genres → Rare genres
   - Within each genre cluster, order by popularity and energy flow
   - Top genres in this playlist: ${JSON.stringify(topGenres)}

2. **Artist Frequency Clustering** (HIGH PRIORITY):
   - Analyze how many songs each artist appears in
   - Group songs by artist frequency: Artists with many songs → Artists with few songs
   - Spread out songs from the same artist to avoid clustering
   - Top artists in this playlist: ${JSON.stringify(topArtists)}

3. **Album Frequency Clustering** (MEDIUM PRIORITY):
   - If albums are available, group songs from the same album together
   - Order albums by their frequency in the playlist

4. **Popularity & Ranking** (HIGH PRIORITY):
   - **Last.fm play counts** (lastFmPlayCount field) indicate real-world popularity
   - **Spotify popularity scores** (0-100) when available
   - Group songs with similar popularity levels together for better relatability
   - Create popularity arcs: Popular hits → Mid-tier → Deep cuts

5. **Genre Flow & Transitions**:
   - Within frequency clusters, create smooth genre transitions
   - Use MusicBrainz tags to identify genre relationships
   - Create smooth progressions rather than jarring jumps

6. **Energy & Mood Progression**:
   - Use Spotify audio features (danceability, energy, valence, tempo) when available
   - Create natural energy arcs within each frequency cluster
   - Match tempo and energy levels for smooth transitions

ORDERING PRINCIPLES:
- Start with the MOST FREQUENT genres (these define the playlist's core identity)
- Within frequent genres, prioritize Billboard chart songs, then popular songs
- Spread out songs from frequent artists to maintain variety
- End with less frequent genres and rare songs (these add variety and discovery)
- Create smooth transitions between frequency clusters

Playlists to order:
${JSON.stringify(playlistDescriptions, null, 2)}

Detailed song information with metadata sources:
${JSON.stringify(detailedSongs, null, 2)}

For each song, the metadataSources array shows which APIs provided data:
- "spotify": Has audio features, Spotify popularity score, and artist genres
- "lastfm": Has Last.fm play counts (popularity indicator) and user-generated tags
- "musicbrainz": Has genre tags and release information

FREQUENCY ANALYSIS SUMMARY:
- Total unique genres: ${Object.keys(genreFrequency).length}
- Total unique artists: ${Object.keys(artistFrequency).length}
- Most common genre: ${topGenres[0]?.genre || 'N/A'} (appears ${topGenres[0]?.count || 0} times)
- Most common artist: ${topArtists[0]?.artist || 'N/A'} (appears ${topArtists[0]?.count || 0} times)

Use this multi-source data to make informed decisions about:
- FREQUENCY CLUSTERING: Group songs by genre/artist frequency (most frequent first)
- POPULARITY RANKING: Billboard positions, Last.fm play counts, Spotify popularity
- GENRE RELATIONSHIPS: Use MusicBrainz tags to understand genre connections
- ENERGY FLOW: Use Spotify audio features to create smooth transitions within clusters

Return a JSON object with this structure:
{
  "playlistOrder": [{"playlistId": "uuid", "order": 1}, ...],
  "songOrders": {
    "playlistId1": [{"songId": "uuid", "order": 1}, ...],
    "playlistId2": [{"songId": "uuid", "order": 1}, ...]
  }
}

CRITICAL REQUIREMENTS - READ CAREFULLY:
1. The "songId" field MUST be the EXACT UUID from the song's "songId" field in the input data above
2. DO NOT use song titles, artist names, or any other text in the "songId" field
3. The "songId" must be a valid UUID format: 8-4-4-4-12 hexadecimal characters separated by hyphens
4. Copy the songId EXACTLY as it appears in the "songId" field of each song object above
5. The "playlistId" field MUST be the EXACT UUID from the playlist's "id" field
6. Look at the "songId" field in each song object - that is what you must use, NOT the "title" field

EXAMPLE FROM YOUR INPUT DATA:
If a song object looks like this:
{
  "songId": "ab8f06e9-5503-4c36-9161-0968e33a3c16",
  "title": "Eternal Youth",
  "artist": "Unknown Artist"
}

Then in your response, you MUST use:
{"songId": "ab8f06e9-5503-4c36-9161-0968e33a3c16", "order": 1}

NOT:
{"songId": "Eternal Youth", "order": 1}  // ❌ WRONG - This is the title, not the songId!

EXAMPLE - CORRECT FORMAT:
{
  "songOrders": {
    "ba364e5b-2c96-4864-806a-3c94550a8589": [
      {"songId": "ab8f06e9-5503-4c36-9161-0968e33a3c16", "order": 1},
      {"songId": "a3c53b01-682c-44d1-b869-6748bcce4bf6", "order": 2}
    ]
  }
}

EXAMPLE - WRONG FORMAT (DO NOT DO THIS):
{
  "songOrders": {
    "ba364e5b-2c96-4864-806a-3c94550a8589": [
      {"songId": "Eternal Youth", "order": 1},  // ❌ WRONG - This is a title!
      {"songId": "Song of the Samurai", "order": 2}  // ❌ WRONG - This is a title!
    ]
  }
}

REMEMBER: Use the "songId" UUID field, NOT the "title" text field!

The order values should start at 1 and increment. Lower numbers appear first.
ALL playlist IDs and song IDs must be included in the response.
Even if there's only one playlist, reorder the songs within it for optimal flow.`;

  // Retry logic with exponential backoff for rate limits
  const maxRetries = 3;
  let lastError = null;
  
  console.log(`[openaiSorting] 🧠 Starting OpenAI analysis for ${playlists.length} playlist(s) and ${allSongsMetadata.length} song(s)`);
  console.log(`[openaiSorting]    Model: gpt-4o-mini`);
  console.log(`[openaiSorting]    Temperature: 0.7`);
  
  // Log sample of what we're sending to OpenAI to verify songIds are UUIDs
  console.log(`[openaiSorting] 📋 Verifying input data structure...`);
  if (detailedSongs.length > 0 && detailedSongs[0].songs.length > 0) {
    const sampleSongs = detailedSongs[0].songs.slice(0, 5);
    console.log(`[openaiSorting]    Sample songs being sent to OpenAI (first 5):`);
    sampleSongs.forEach((s, idx) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(String(s.songId));
      const status = isValidUuid ? '✅' : '❌';
      console.log(`[openaiSorting]      ${status} Song ${idx + 1}: songId="${s.songId}" (isUUID: ${isValidUuid}), title="${s.title}", artist="${s.artist}"`);
    });
    
    // Count how many have valid UUIDs
    const validUuidCount = detailedSongs.reduce((sum, p) => {
      return sum + p.songs.filter(s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s.songId))).length;
    }, 0);
    const totalSongs = detailedSongs.reduce((sum, p) => sum + p.songs.length, 0);
    console.log(`[openaiSorting]    Input validation: ${validUuidCount}/${totalSongs} songs have valid UUID songIds`);
    
    if (validUuidCount < totalSongs) {
      console.error(`[openaiSorting] ❌ CRITICAL: ${totalSongs - validUuidCount} songs have invalid songIds in input data!`);
    }
  }
  
  console.log(`[openaiSorting] 📏 Prompt size: ${prompt.length} characters`);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`[openaiSorting] 🔄 Retry attempt ${attempt + 1}/${maxRetries}`);
    }
    
    try {
      const aiRequestStart = Date.now();
      console.log(`[openaiSorting] 📤 Sending request to OpenAI...`);
      console.log(`[openaiSorting]    Request timestamp: ${new Date().toISOString()}`);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4 if needed
        messages: [
          {
            role: 'system',
            content: 'You are a music expert that analyzes playlists and creates optimal listening orders. Always respond with valid JSON only, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const aiRequestTime = ((Date.now() - aiRequestStart) / 1000).toFixed(2);
      console.log(`[openaiSorting] ✅ Received response from OpenAI in ${aiRequestTime}s`);
      
      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      console.log(`[openaiSorting] 📝 Parsing JSON response (${responseText.length} chars)...`);
      console.log(`[openaiSorting] 📄 Raw response preview (first 500 chars):`, responseText.substring(0, 500));
      
      const result = JSON.parse(responseText);
      console.log(`[openaiSorting] ✅ Successfully parsed response`);
      console.log(`[openaiSorting]    Response structure:`, {
        hasPlaylistOrder: !!result.playlistOrder,
        playlistOrderLength: result.playlistOrder?.length || 0,
        hasSongOrders: !!result.songOrders,
        songOrdersKeys: result.songOrders ? Object.keys(result.songOrders) : [],
        songOrdersCounts: result.songOrders ? Object.entries(result.songOrders).map(([k, v]) => ({ playlistId: k, count: Array.isArray(v) ? v.length : 0 })) : []
      });
      
      // Log a sample of what OpenAI returned for debugging
      if (result.songOrders && Object.keys(result.songOrders).length > 0) {
        const firstPlaylistId = Object.keys(result.songOrders)[0];
        const firstSongs = result.songOrders[firstPlaylistId]?.slice(0, 10) || [];
        console.log(`[openaiSorting] 📋 Sample song IDs from OpenAI (first 10 in playlist ${firstPlaylistId}):`);
        firstSongs.forEach((s, idx) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isValidUuid = uuidRegex.test(String(s.songId));
          const status = isValidUuid ? '✅' : '❌';
          console.log(`[openaiSorting]    ${status} Song ${idx + 1}: songId="${s.songId}" (type: ${typeof s.songId}, length: ${String(s.songId).length}, isUUID: ${isValidUuid}), order=${s.order}`);
        });
        
        // Count how many are invalid
        const invalidCount = firstSongs.filter(s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s.songId))).length;
        if (invalidCount > 0) {
          console.error(`[openaiSorting] ❌ CRITICAL: ${invalidCount}/${firstSongs.length} sample songs have invalid UUIDs!`);
        }
      }

      // CRITICAL: Validate and fix song IDs - OpenAI sometimes returns titles instead of UUIDs
      console.log(`[openaiSorting] 🔧 Starting song ID validation and correction...`);
      console.log(`[openaiSorting]    Total songs in metadata: ${allSongsMetadata.length}`);
      
      // Create a mapping from title to songId for correction
      const titleToSongIdMap = new Map();
      const songIdSet = new Set();
      const songIdToTitleMap = new Map(); // For reverse lookup
      
      allSongsMetadata.forEach(song => {
        const titleKey = `${song.title}|||${song.artist || ''}`.toLowerCase().trim();
        titleToSongIdMap.set(titleKey, song.songId);
        titleToSongIdMap.set(song.title.toLowerCase().trim(), song.songId); // Title-only fallback
        songIdSet.add(song.songId);
        songIdToTitleMap.set(song.songId, { title: song.title, artist: song.artist });
      });
      
      console.log(`[openaiSorting]    Built mapping: ${titleToSongIdMap.size} title keys, ${songIdSet.size} unique song IDs`);
      console.log(`[openaiSorting]    Sample mappings (first 3):`, Array.from(titleToSongIdMap.entries()).slice(0, 3).map(([key, id]) => ({
        key: key.substring(0, 50),
        songId: id
      })));

      // Validate and transform the response
      const playlistOrder = result.playlistOrder || [];
      const songOrders = result.songOrders || {};
      
      // Fix song IDs that are titles instead of UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let fixedCount = 0;
      let invalidCount = 0;
      let validCount = 0;
      let notFoundCount = 0;
      
      console.log(`[openaiSorting] 🔍 Validating song IDs in ${Object.keys(songOrders).length} playlist(s)...`);
      
      for (const [playlistId, songs] of Object.entries(songOrders)) {
        if (!Array.isArray(songs)) {
          console.warn(`[openaiSorting] ⚠️  Playlist ${playlistId} has non-array songOrders:`, typeof songs);
          continue;
        }
        
        console.log(`[openaiSorting]    Processing playlist ${playlistId}: ${songs.length} song(s)`);
        
        for (let i = 0; i < songs.length; i++) {
          const song = songs[i];
          const originalSongId = song.songId;
          
          if (!song.songId) {
            console.error(`[openaiSorting] ❌ Song at index ${i} (order ${song.order}) has no songId field!`);
            console.error(`[openaiSorting]    Full song object:`, JSON.stringify(song, null, 2));
            invalidCount++;
            continue;
          }
          
          const songIdStr = String(song.songId);
          const isValidUuid = uuidRegex.test(songIdStr);
          
          console.log(`[openaiSorting]    Song ${i + 1}/${songs.length}: songId="${songIdStr}" (type: ${typeof song.songId}, length: ${songIdStr.length}, isUUID: ${isValidUuid})`);
          
          if (!isValidUuid) {
            // This is likely a title, try to find the actual songId
            const searchKey = songIdStr.toLowerCase().trim();
            console.log(`[openaiSorting]      ❌ Invalid UUID, attempting to map title "${songIdStr}" to songId...`);
            let foundId = null;
            let matchMethod = null;
            
            // Try exact match with title+artist
            for (const [key, id] of titleToSongIdMap.entries()) {
              if (key === searchKey || key.startsWith(searchKey + '|||') || key.endsWith('|||' + searchKey)) {
                foundId = id;
                matchMethod = 'exact-title+artist';
                break;
              }
            }
            
            // Try title-only match
            if (!foundId && titleToSongIdMap.has(searchKey)) {
              foundId = titleToSongIdMap.get(searchKey);
              matchMethod = 'exact-title-only';
            }
            
            // Try partial match
            if (!foundId) {
              for (const [key, id] of titleToSongIdMap.entries()) {
                const [title] = key.split('|||');
                if (title === searchKey || searchKey === title || title.includes(searchKey) || searchKey.includes(title)) {
                  foundId = id;
                  matchMethod = 'partial-match';
                  break;
                }
              }
            }
            
            if (foundId) {
              const titleInfo = songIdToTitleMap.get(foundId);
              console.log(`[openaiSorting]      ✅ Fixed via ${matchMethod}: "${songIdStr}" → ${foundId} (title: "${titleInfo?.title}", artist: "${titleInfo?.artist}")`);
              song.songId = foundId;
              fixedCount++;
            } else {
              console.error(`[openaiSorting]      ❌ Could not map title to songId: "${songIdStr}"`);
              console.error(`[openaiSorting]      Available title keys (first 5):`, Array.from(titleToSongIdMap.keys()).slice(0, 5));
              invalidCount++;
            }
          } else if (!songIdSet.has(songIdStr)) {
            console.warn(`[openaiSorting]      ⚠️  SongId ${songIdStr} is valid UUID but not found in input songs`);
            notFoundCount++;
          } else {
            const titleInfo = songIdToTitleMap.get(songIdStr);
            console.log(`[openaiSorting]      ✅ Valid UUID: ${songIdStr} (title: "${titleInfo?.title}", artist: "${titleInfo?.artist}")`);
            validCount++;
          }
        }
      }
      
      console.log(`[openaiSorting] 📊 Validation summary:`);
      console.log(`[openaiSorting]    ✅ Valid UUIDs: ${validCount}`);
      console.log(`[openaiSorting]    🔧 Fixed (title→UUID): ${fixedCount}`);
      console.log(`[openaiSorting]    ⚠️  Valid UUID but not in input: ${notFoundCount}`);
      console.log(`[openaiSorting]    ❌ Could not fix: ${invalidCount}`);
      
      if (fixedCount > 0) {
        console.log(`[openaiSorting] 🔧 Fixed ${fixedCount} song ID(s) that were returned as titles`);
      }
      if (invalidCount > 0) {
        console.error(`[openaiSorting] ❌ ${invalidCount} song(s) could not be mapped to valid IDs`);
      }

      // Ensure all playlists are included
      const playlistIds = new Set(playlists.map(p => p.id));
      const orderedPlaylistIds = new Set(playlistOrder.map(p => p.playlistId));
      
      let missingPlaylists = 0;
      // Add any missing playlists to the end
      playlistIds.forEach(id => {
        if (!orderedPlaylistIds.has(id)) {
          missingPlaylists++;
          playlistOrder.push({
            playlistId: id,
            order: playlistOrder.length + 1,
          });
        }
      });
      if (missingPlaylists > 0) {
        console.log(`[openaiSorting] ⚠️  Added ${missingPlaylists} missing playlist(s) to order`);
      }

      // Ensure all songs are included in their respective playlists
      let totalMissingSongs = 0;
      Object.keys(songsByPlaylist).forEach(playlistId => {
        if (!songOrders[playlistId]) {
          songOrders[playlistId] = [];
        }
        
        const songs = songsByPlaylist[playlistId];
        const orderedSongIds = new Set(songOrders[playlistId].map(s => s.songId));
        
        songs.forEach(song => {
          if (!orderedSongIds.has(song.songId)) {
            totalMissingSongs++;
            songOrders[playlistId].push({
              songId: song.songId,
              order: songOrders[playlistId].length + 1,
            });
          }
        });
      });
      if (totalMissingSongs > 0) {
        console.log(`[openaiSorting] ⚠️  Added ${totalMissingSongs} missing song(s) to orders`);
      }

      console.log(`[openaiSorting] ✅ Analysis complete: ${playlistOrder.length} playlist(s), ${Object.keys(songOrders).length} playlist(s) with song orders`);
      
      return {
        playlistOrder,
        songOrders,
      };
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit or quota error
      const isRateLimit = error.status === 429 || 
                         error.code === 'rate_limit_exceeded' ||
                         error.message?.includes('rate limit');
      
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.type === 'insufficient_quota' ||
                          error.message?.includes('quota') ||
                          error.message?.includes('billing');
      
      // Quota errors shouldn't be retried - they need billing action
      if (isQuotaError) {
        console.error('[openaiSorting] OpenAI quota exceeded. Please check your OpenAI billing and plan.');
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and plan settings.');
      }
      
      if (isRateLimit && attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[openaiSorting] Rate limited (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not a rate limit or we've exhausted retries, throw
      throw error;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to analyze playlists after retries');
}

/**
 * Analyze and sort songs within a single playlist
 * @param {Array} songsMetadata - Array of song metadata objects
 * @returns {Promise<Array>} Array of {songId, order} objects
 */
export async function analyzeAndSortSongs(songsMetadata) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  if (songsMetadata.length === 0) {
    return [];
  }

  if (songsMetadata.length === 1) {
    return [{ songId: songsMetadata[0].songId, order: 1 }];
  }

  const songDescriptions = songsMetadata.map(song => ({
    id: song.songId,
    title: song.title,
    artist: song.artist,
    genres: song.genres || [],
    popularity: song.popularity || 0,
    audioFeatures: song.audioFeatures || {},
  }));

  const prompt = `You are a music playlist curator. Analyze the following songs and provide an optimal ordering that creates a smooth listening experience.

Consider:
1. Genre flow - group similar genres together, but create interesting transitions
2. Artist diversity - avoid clustering too many songs from the same artist
3. Popularity balance - mix popular and less popular songs for variety
4. Energy flow - create a natural progression (if audio features available)

Songs to order:
${JSON.stringify(songDescriptions, null, 2)}

Return a JSON object with this structure:
{
  "songOrder": [{"songId": "uuid", "order": 1}, ...]
}

The order values should start at 1 and increment. Lower numbers appear first.
All song IDs must be included in the response.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a music expert that analyzes songs and creates optimal listening orders. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    const result = JSON.parse(responseText);
    const songOrder = result.songOrder || [];

    // Ensure all songs are included
    const songIds = new Set(songsMetadata.map(s => s.songId));
    const orderedSongIds = new Set(songOrder.map(s => s.songId));

    songIds.forEach(id => {
      if (!orderedSongIds.has(id)) {
        songOrder.push({
          songId: id,
          order: songOrder.length + 1,
        });
      }
    });

    return songOrder;
  } catch (error) {
    console.error('[openaiSorting] Error analyzing songs:', error);
    throw error;
  }
}

/**
 * Analyze and sort ALL songs with FAIR DISTRIBUTION for the unified "All" view
 * 
 * ALGORITHM PRIORITIES:
 * 1. Popular songs (top 20% by popularity) go to the top
 * 2. Fair distribution of genres - no consecutive same genre
 * 3. Fair distribution of artists - no consecutive same artist  
 * 4. Maintain flow - smooth transitions, no jarring contrasts
 * 5. Songs outside top 20% are spread evenly throughout
 * 
 * @param {Array} allSongsMetadata - Array of ALL song metadata objects from all playlists
 * @returns {Promise<Object>} Object with sortedSongIds array and summary
 */
export async function analyzeAndSortByVibe(allSongsMetadata) {
  console.log('\n========== [SMART SORT - FAIR DISTRIBUTION] Starting ==========');
  console.log(`[smartSort] 🎵 Processing ${allSongsMetadata.length} songs`);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  if (!allSongsMetadata || allSongsMetadata.length === 0) {
    console.log('[smartSort] ⚠️ No songs to sort');
    return {
      sortedSongIds: [],
      summary: {
        totalSongs: 0,
        sortingStrategy: 'empty',
        genreDistribution: {},
        artistDistribution: {}
      }
    };
  }

  // Handle single song case
  if (allSongsMetadata.length === 1) {
    console.log('[smartSort] ℹ️ Only one song, returning as-is');
    return {
      sortedSongIds: [allSongsMetadata[0].songId],
      summary: {
        totalSongs: 1,
        sortingStrategy: 'single song',
        genreDistribution: { [allSongsMetadata[0].genres?.[0] || 'unknown']: 1 },
        artistDistribution: { [allSongsMetadata[0].artist || 'Unknown']: 1 }
      }
    };
  }

  // Check for maximum songs limit
  if (allSongsMetadata.length > 300) {
    console.error(`[smartSort] ❌ Too many songs: ${allSongsMetadata.length} (max 300)`);
    throw new Error(`Too many songs. Maximum 300 songs supported for sorting. You have ${allSongsMetadata.length} songs.`);
  }

  // Build song data for OpenAI
  const songDataForAI = allSongsMetadata.map(song => ({
    songId: song.songId,
    title: song.title,
    artist: song.artist || 'Unknown Artist',
    genres: song.genres || [],
    popularity: song.popularity || 0,
    energy: song.audioFeatures?.energy ?? null,
    tempo: song.audioFeatures?.tempo ?? null,
    valence: song.audioFeatures?.valence ?? null,
  }));

  // Calculate statistics
  const genreFrequency = {};
  const artistFrequency = {};
  const popularityValues = [];
  
  allSongsMetadata.forEach(song => {
    (song.genres || []).forEach(genre => {
      genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
    });
    const artist = song.artist || 'Unknown Artist';
    artistFrequency[artist] = (artistFrequency[artist] || 0) + 1;
    popularityValues.push(song.popularity || 0);
  });

  // Calculate top 20% popularity threshold
  const sortedPopularity = [...popularityValues].sort((a, b) => b - a);
  const top20Index = Math.max(1, Math.floor(sortedPopularity.length * 0.2));
  const popularityThreshold = sortedPopularity[top20Index - 1] || 0;

  const genreList = Object.entries(genreFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));

  const artistList = Object.entries(artistFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([artist, count]) => ({ artist, count }));

  console.log(`[smartSort] 📊 Stats:`);
  console.log(`[smartSort]    - ${genreList.length} unique genres`);
  console.log(`[smartSort]    - ${artistList.length} unique artists`);
  console.log(`[smartSort]    - Top 20% popularity threshold: ${popularityThreshold}`);
  console.log(`[smartSort]    - Top genres:`, genreList.slice(0, 5).map(g => g.genre).join(', '));
  console.log(`[smartSort]    - Top artists:`, artistList.slice(0, 5).map(a => a.artist).join(', '));

  // Build the prompt
  const systemPrompt = `You are an expert music curator creating a perfectly balanced listening experience.

═══════════════════════════════════════════════════════════
SORTING ALGORITHM (FOLLOW THIS EXACTLY)
═══════════════════════════════════════════════════════════

PRIORITY 1: POPULARITY-BASED ORDERING
- Songs with popularity >= ${popularityThreshold} (top 20%) should be placed in the FIRST HALF of the playlist
- Within the top 20%, order by popularity (highest first)
- Songs below top 20% should be SPREAD EVENLY throughout the second half

PRIORITY 2: NO CONSECUTIVE SAME ARTIST
- NEVER place two songs by the same artist back-to-back
- If an artist has multiple songs, space them out as much as possible
- This is CRITICAL - same artist clustering ruins the experience

PRIORITY 3: NO CONSECUTIVE SAME GENRE  
- NEVER place two songs of the same genre back-to-back
- Map raw genre tags to standard categories first:
  * Pop, Hip-Hop/Rap, Rock, Electronic/Dance, R&B/Soul, Latin, Country, Jazz/Blues, Classical, Other
- Interleave genres throughout the playlist

PRIORITY 4: SMOOTH FLOW (TIE-BREAKER)
- When choosing between songs that satisfy above rules, consider:
  * Similar tempo (don't jump from 60 BPM to 180 BPM)
  * Similar energy levels for smooth transitions
  * Avoid jarring contrasts (death metal → acoustic ballad)

═══════════════════════════════════════════════════════════
FORBIDDEN - DO NOT DO THESE
═══════════════════════════════════════════════════════════
❌ Two songs by same artist consecutively
❌ Two songs of same genre consecutively  
❌ Clustering all popular songs together without distribution
❌ Grouping songs by when they were added or which playlist

Always respond with valid JSON only.`;

  const userPrompt = `Sort these ${songDataForAI.length} songs following the algorithm above.

STATISTICS:
- Total songs: ${songDataForAI.length}
- Top 20% popularity threshold: ${popularityThreshold}
- Songs in top 20%: ${songDataForAI.filter(s => s.popularity >= popularityThreshold).length}
- Unique artists: ${artistList.length}
- Artists with multiple songs: ${artistList.filter(a => a.count > 1).map(a => `${a.artist}(${a.count})`).slice(0, 10).join(', ')}
- Top genres: ${genreList.slice(0, 10).map(g => `${g.genre}(${g.count})`).join(', ')}

SONGS TO SORT:
${JSON.stringify(songDataForAI, null, 2)}

Return JSON with this structure:
{
  "sortedSongIds": ["uuid-1", "uuid-2", ...],
  "summary": {
    "totalSongs": ${songDataForAI.length},
    "sortingStrategy": "describe your approach",
    "top20Count": <number of songs in top 20%>,
    "genreDistribution": {"Pop": N, "Hip-Hop/Rap": N, ...},
    "artistDistribution": {"Artist1": N, "Artist2": N, ...}
  }
}

REQUIREMENTS:
1. Use the EXACT songId UUID from each song (not titles!)
2. Include ALL ${songDataForAI.length} songs - no duplicates, no omissions
3. NEVER have same artist consecutive
4. NEVER have same genre consecutive
5. Popular songs (>= ${popularityThreshold} popularity) should be in the first half
6. Less popular songs spread evenly in second half`;

  // Retry logic
  const maxRetries = 3;
  let lastError = null;

  console.log(`[smartSort] 🧠 Sending to OpenAI...`);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`[smartSort] 🔄 Retry attempt ${attempt + 1}/${maxRetries}`);
    }

    try {
      const aiRequestStart = Date.now();

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5, // Lower temperature for more consistent results
        response_format: { type: 'json_object' },
      });

      const aiRequestTime = ((Date.now() - aiRequestStart) / 1000).toFixed(2);
      console.log(`[smartSort] ✅ OpenAI response in ${aiRequestTime}s`);

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(responseText);

      if (!result.sortedSongIds || !Array.isArray(result.sortedSongIds)) {
        throw new Error('Response missing sortedSongIds array');
      }

      console.log(`[smartSort] 📋 Received ${result.sortedSongIds.length} song IDs`);

      // Build maps for validation
      const inputSongIds = new Set(allSongsMetadata.map(s => s.songId));
      const titleToIdMap = new Map();
      const songIdToData = new Map();

      allSongsMetadata.forEach(song => {
        const titleKey = song.title.toLowerCase().trim();
        titleToIdMap.set(titleKey, song.songId);
        titleToIdMap.set(`${titleKey}|||${(song.artist || '').toLowerCase().trim()}`, song.songId);
        songIdToData.set(song.songId, song);
      });

      // Validate and fix song IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validatedSongIds = [];
      const seenIds = new Set();
      let fixedCount = 0;

      for (const rawId of result.sortedSongIds) {
        let songId = String(rawId).trim();
        
        if (!uuidRegex.test(songId)) {
          const foundId = titleToIdMap.get(songId.toLowerCase().trim());
          if (foundId) {
            songId = foundId;
            fixedCount++;
          } else {
            continue;
          }
        }

        if (inputSongIds.has(songId) && !seenIds.has(songId)) {
          validatedSongIds.push(songId);
          seenIds.add(songId);
        }
      }

      // Add missing songs
      let missingCount = 0;
      for (const song of allSongsMetadata) {
        if (!seenIds.has(song.songId)) {
          validatedSongIds.push(song.songId);
          seenIds.add(song.songId);
          missingCount++;
        }
      }

      // Validate the sort quality
      let consecutiveArtistViolations = 0;
      let consecutiveGenreViolations = 0;
      let lastArtist = null;
      let lastGenre = null;

      for (const songId of validatedSongIds) {
        const song = songIdToData.get(songId);
        if (song) {
          const artist = song.artist || 'Unknown';
          const genre = (song.genres || [])[0] || 'Unknown';
          
          if (artist === lastArtist) consecutiveArtistViolations++;
          if (genre === lastGenre) consecutiveGenreViolations++;
          
          lastArtist = artist;
          lastGenre = genre;
        }
      }

      console.log(`[smartSort] 📊 Quality check:`);
      console.log(`[smartSort]    - Consecutive artist violations: ${consecutiveArtistViolations}`);
      console.log(`[smartSort]    - Consecutive genre violations: ${consecutiveGenreViolations}`);
      console.log(`[smartSort]    - Fixed IDs: ${fixedCount}, Missing added: ${missingCount}`);

      const summary = result.summary || {
        totalSongs: validatedSongIds.length,
        sortingStrategy: 'popularity-first with fair distribution',
        genreDistribution: genreFrequency,
        artistDistribution: artistFrequency
      };
      summary.totalSongs = validatedSongIds.length;
      summary.qualityMetrics = {
        consecutiveArtistViolations,
        consecutiveGenreViolations
      };

      console.log('========== [SMART SORT] Complete ==========\n');

      return {
        sortedSongIds: validatedSongIds,
        summary
      };

    } catch (error) {
      lastError = error;

      const isQuotaError = error.code === 'insufficient_quota' ||
                          error.message?.includes('quota') ||
                          error.message?.includes('billing');

      if (isQuotaError) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and plan settings.');
      }

      const isRateLimit = error.status === 429 ||
                         error.message?.includes('rate limit');

      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[smartSort] ⚠️ Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error(`[smartSort] ❌ Error:`, error.message);
      throw error;
    }
  }

  throw lastError || new Error('Failed to sort songs after retries');
}

