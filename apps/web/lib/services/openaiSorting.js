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

  const prompt = `You are a music playlist curator. Analyze the following playlists and their songs, then provide an optimal ordering that creates a smooth listening experience.

Consider:
1. Genre flow - group similar genres together, but create interesting transitions
2. Artist diversity - avoid clustering too many songs from the same artist
3. Popularity balance - mix popular and less popular songs for variety
4. Energy flow - create a natural progression (if audio features available)

Playlists to order:
${JSON.stringify(playlistDescriptions, null, 2)}

For each playlist, also consider the individual songs:
${playlistDescriptions.map(p => {
  const songs = songsByPlaylist[p.id] || [];
  return `\nPlaylist "${p.name}" (${p.id}):\n${songs.map((s, idx) => 
    `  ${idx + 1}. "${s.title}" by ${s.artist} - Genres: ${s.genres?.join(', ') || 'unknown'}, Popularity: ${s.popularity || 0}`
  ).join('\n')}`;
}).join('\n')}

Return a JSON object with this structure:
{
  "playlistOrder": [{"playlistId": "uuid", "order": 1}, ...],
  "songOrders": {
    "playlistId1": [{"songId": "uuid", "order": 1}, ...],
    "playlistId2": [{"songId": "uuid", "order": 1}, ...]
  }
}

The order values should start at 1 and increment. Lower numbers appear first.
All playlist IDs and song IDs must be included in the response.`;

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
    console.error('[openaiSorting] Error analyzing playlists:', error);
    throw error;
  }
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

