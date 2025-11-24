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
  const detailedSongs = playlists.map(playlist => {
    const songs = songsByPlaylist[playlist.id] || [];
    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      songs: songs.map(s => ({
        songId: s.songId,
        title: s.title,
        artist: s.artist,
        genres: s.genres || [],
        popularity: s.popularity || 0, // Spotify popularity (0-100) or Last.fm play count
        lastFmPlayCount: s.lastFmPlayCount || null, // Last.fm play count for relatability analysis
        audioFeatures: s.audioFeatures || {},
        metadataSources: s.sources || [], // Shows which APIs provided data (spotify, lastfm, musicbrainz)
      }))
    };
  });

  const prompt = `You are an expert music playlist curator. Analyze the following playlists and their songs using data from multiple music databases (Spotify, Last.fm, MusicBrainz), then provide an optimal ordering that creates a smooth, engaging listening experience.

IMPORTANT ANALYSIS CRITERIA:
1. **Popularity & Relatability Analysis** (CRITICAL):
   - **Last.fm play counts** (lastFmPlayCount field) indicate real-world popularity and relatability
     * Higher play counts = more mainstream/popular songs
     * Lower play counts = niche/deeper cuts
     * Songs with similar play counts are more relatable to similar audiences
   - **Spotify popularity scores** (0-100) when available provide another popularity metric
   - Use MusicBrainz genre tags to understand musical relationships and cultural connections
   - **Balance strategy**: Mix popular hits with deeper cuts, but group songs with similar popularity levels together for better relatability
   - **Relatability principle**: Songs that are similarly popular tend to appeal to similar listeners and flow better together

2. **Genre Flow & Transitions**:
   - Group similar genres together, but create interesting transitions between different styles
   - Use MusicBrainz tags to identify genre relationships (e.g., "indie rock" flows well into "alternative rock")
   - Create smooth genre progressions rather than jarring jumps

3. **Artist Diversity**:
   - Avoid clustering too many songs from the same artist
   - Spread artist appearances throughout the playlist for variety
   - Consider artist popularity and style when ordering

4. **Energy & Mood Progression**:
   - Use Spotify audio features (danceability, energy, valence, tempo) when available
   - Create natural energy arcs: build up, peak, cool down
   - Match tempo and energy levels for smooth transitions

5. **Data Source Reliability**:
   - Songs with data from multiple sources (Spotify + Last.fm + MusicBrainz) are more reliable
   - Prioritize songs with richer metadata when making ordering decisions
   - Last.fm play counts indicate real-world popularity and relatability

Playlists to order:
${JSON.stringify(playlistDescriptions, null, 2)}

Detailed song information with metadata sources:
${JSON.stringify(detailedSongs, null, 2)}

For each song, the metadataSources array shows which APIs provided data:
- "spotify": Has audio features, Spotify popularity score, and artist genres
- "lastfm": Has Last.fm play counts (popularity indicator) and user-generated tags
- "musicbrainz": Has genre tags and release information

Use this multi-source data to make informed decisions about:
- Which songs are most popular/relatable (Last.fm play counts)
- Which genres are related (MusicBrainz tags)
- How songs flow together (Spotify audio features + genre analysis)

Return a JSON object with this structure:
{
  "playlistOrder": [{"playlistId": "uuid", "order": 1}, ...],
  "songOrders": {
    "playlistId1": [{"songId": "uuid", "order": 1}, ...],
    "playlistId2": [{"songId": "uuid", "order": 1}, ...]
  }
}

The order values should start at 1 and increment. Lower numbers appear first.
ALL playlist IDs and song IDs must be included in the response.
Even if there's only one playlist, reorder the songs within it for optimal flow.`;

  // Retry logic with exponential backoff for rate limits
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(responseText);

      // Validate and transform the response
      const playlistOrder = result.playlistOrder || [];
      const songOrders = result.songOrders || {};

      // Ensure all playlists are included
      const playlistIds = new Set(playlists.map(p => p.id));
      const orderedPlaylistIds = new Set(playlistOrder.map(p => p.playlistId));
      
      // Add any missing playlists to the end
      playlistIds.forEach(id => {
        if (!orderedPlaylistIds.has(id)) {
          playlistOrder.push({
            playlistId: id,
            order: playlistOrder.length + 1,
          });
        }
      });

      // Ensure all songs are included in their respective playlists
      Object.keys(songsByPlaylist).forEach(playlistId => {
        if (!songOrders[playlistId]) {
          songOrders[playlistId] = [];
        }
        
        const songs = songsByPlaylist[playlistId];
        const orderedSongIds = new Set(songOrders[playlistId].map(s => s.songId));
        
        songs.forEach(song => {
          if (!orderedSongIds.has(song.songId)) {
            songOrders[playlistId].push({
              songId: song.songId,
              order: songOrders[playlistId].length + 1,
            });
          }
        });
      });

      return {
        playlistOrder,
        songOrders,
      };
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit or quota error
      const isRateLimit = error.status === 429 || 
                         error.code === 'insufficient_quota' || 
                         error.type === 'insufficient_quota' ||
                         error.message?.includes('quota') ||
                         error.message?.includes('rate limit');
      
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

