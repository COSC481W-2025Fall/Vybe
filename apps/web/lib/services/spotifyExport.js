/**
 * Convert a Spotify track ID to a Spotify URI
 * @param {string} trackId - Spotify track ID (22 characters)
 * @returns {string} - Spotify URI in format "spotify:track:..."
 */
export function trackIdToUri(trackId) {
  if (!trackId) return null;
  // Remove any existing "spotify:track:" prefix
  const cleanId = trackId.replace(/^spotify:track:/, '');
  return `spotify:track:${cleanId}`;
}

/**
 * Clean up a YouTube title for better Spotify search results
 * Removes common YouTube suffixes, brackets, and extra info
 * @param {string} title - Original title
 * @returns {string} - Cleaned title
 */
function cleanYouTubeTitle(title) {
  if (!title) return '';
  
  let cleaned = title;
  
  // Remove common YouTube video suffixes (case insensitive)
  const patternsToRemove = [
    /\s*\(?\s*official\s*(music\s*)?video\s*\)?/gi,
    /\s*\(?\s*official\s*audio\s*\)?/gi,
    /\s*\(?\s*official\s*lyric\s*video\s*\)?/gi,
    /\s*\(?\s*lyrics?\s*(video)?\s*\)?/gi,
    /\s*\(?\s*visualizer\s*\)?/gi,
    /\s*\(?\s*audio\s*(only)?\s*\)?/gi,
    /\s*\(?\s*hd\s*\)?/gi,
    /\s*\(?\s*hq\s*\)?/gi,
    /\s*\(?\s*4k\s*\)?/gi,
    /\s*\(?\s*mv\s*\)?/gi,
    /\s*\(?\s*m\/v\s*\)?/gi,
    /\s*\(?\s*live\s*(performance|session|version)?\s*\)?/gi,
    /\s*\(?\s*vevo\s*\)?/gi,
    /\s*\[?\s*explicit\s*\]?/gi,
    /\s*\[?\s*clean\s*(version)?\s*\]?/gi,
    /\s*\|\s*.*/gi, // Remove everything after |
    /\s*-\s*topic$/gi, // YouTube auto-generated channels end with "- Topic"
  ];
  
  for (const pattern of patternsToRemove) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove content in square brackets like [Official Video]
  cleaned = cleaned.replace(/\s*\[[^\]]*\]/g, '');
  
  // Remove content in parentheses that looks like video info
  cleaned = cleaned.replace(/\s*\([^)]*(?:video|audio|remix|version|edit|mix)[^)]*\)/gi, '');
  
  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Extract potential song name and artist from a YouTube title
 * YouTube titles often use " - " to separate artist and song
 * @param {string} title - YouTube title
 * @returns {{ songName: string, artistFromTitle: string|null }}
 */
function parseYouTubeTitle(title) {
  if (!title) return { songName: '', artistFromTitle: null };
  
  const cleaned = cleanYouTubeTitle(title);
  
  // Try to split by common separators: " - ", " – ", " — "
  const separators = [' - ', ' – ', ' — ', ' | '];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      if (parts.length >= 2) {
        // Usually format is "Artist - Song Name" or "Song Name - Artist"
        // We'll return both parts, caller can try both orders
        return {
          songName: parts[1].trim(),
          artistFromTitle: parts[0].trim(),
        };
      }
    }
  }
  
  return { songName: cleaned, artistFromTitle: null };
}

/**
 * Perform a Spotify search with given query
 * @param {string} query - Search query
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<string|null>} - Spotify track URI or null
 */
async function spotifySearch(query, accessToken) {
  const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`;
  
  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const tracks = data.tracks?.items;
  
  if (tracks && tracks.length > 0) {
    return tracks[0].uri;
  }

  return null;
}

/**
 * Search for a track on Spotify by title and artist
 * Uses multiple search strategies with fallbacks for better matching
 * @param {string} title - Track title
 * @param {string} artist - Track artist
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<string|null>} - Spotify track URI or null if not found
 */
export async function searchSpotifyTrack(title, artist, accessToken) {
  if (!title || !accessToken) return null;

  try {
    // Strategy 1: Search with title and artist using "artist:" filter
    if (artist) {
      const query1 = `${title} artist:${artist}`;
      const result1 = await spotifySearch(query1, accessToken);
      if (result1) {
        return result1;
      }
    }
    
    // Strategy 2: Search with cleaned title and artist (no filter, just keywords)
    const cleanedTitle = cleanYouTubeTitle(title);
    if (artist) {
      const query2 = `${cleanedTitle} ${artist}`;
      const result2 = await spotifySearch(query2, accessToken);
      if (result2) {
        return result2;
      }
    }
    
    // Strategy 3: Search with just the cleaned title
    if (cleanedTitle && cleanedTitle !== title) {
      const result3 = await spotifySearch(cleanedTitle, accessToken);
      if (result3) {
        return result3;
      }
    }
    
    // Strategy 4: Try parsing YouTube title format (Artist - Song or Song - Artist)
    const parsed = parseYouTubeTitle(title);
    if (parsed.artistFromTitle) {
      // Try: Song Name + Artist from title
      const query4a = `${parsed.songName} ${parsed.artistFromTitle}`;
      const result4a = await spotifySearch(query4a, accessToken);
      if (result4a) {
        return result4a;
      }
      
      // Try reversed: maybe it was "Song - Artist" format
      const query4b = `${parsed.artistFromTitle} ${parsed.songName}`;
      const result4b = await spotifySearch(query4b, accessToken);
      if (result4b) {
        return result4b;
      }
    }
    
    // Strategy 5: Just the original title as last resort
    const result5 = await spotifySearch(title, accessToken);
    if (result5) {
      return result5;
    }
    
    // Strategy 6: Try first few words of cleaned title (for very long titles)
    const words = cleanedTitle.split(' ');
    if (words.length > 4) {
      const shortQuery = words.slice(0, 4).join(' ');
      if (artist) {
        const result6a = await spotifySearch(`${shortQuery} ${artist}`, accessToken);
        if (result6a) {
          return result6a;
        }
      }
      const result6b = await spotifySearch(shortQuery, accessToken);
      if (result6b) {
        return result6b;
      }
    }

    console.warn(`[spotifyExport] Could not find "${title}" by "${artist || 'unknown'}" on Spotify after all strategies`);
    return null;
  } catch (error) {
    console.error(`[spotifyExport] Error searching for "${title}":`, error);
    return null;
  }
}

/**
 * Convert database tracks to Spotify URIs
 * Handles both Spotify tracks (with external_id) and YouTube tracks (searches Spotify)
 * 
 * @param {Array} tracks - Array of track objects from database
 * @param {string} platform - 'spotify' or 'youtube'
 * @param {string} accessToken - Spotify access token (required for YouTube tracks)
 * @returns {Promise<Array>} - Array of Spotify URIs
 */
export async function convertTracksToSpotifyUris(tracks, platform, accessToken) {
  const uris = [];
  const missingTracks = [];

  for (const track of tracks) {
    if (platform === 'spotify' && track.external_id) {
      // Direct conversion for Spotify tracks
      const uri = trackIdToUri(track.external_id);
      if (uri) {
        uris.push(uri);
      } else {
        missingTracks.push(track);
      }
    } else {
      // For YouTube tracks or Spotify tracks without external_id, search Spotify
      if (!accessToken) {
        console.warn(`[spotifyExport] No access token provided, cannot search for "${track.title}"`);
        missingTracks.push(track);
        continue;
      }

      const uri = await searchSpotifyTrack(track.title, track.artist, accessToken);
      if (uri) {
        uris.push(uri);
      } else {
        missingTracks.push(track);
      }
    }
  }

  if (missingTracks.length > 0) {
    console.warn(`[spotifyExport] Could not find ${missingTracks.length} tracks on Spotify:`, 
      missingTracks.map(t => `${t.title} - ${t.artist || 'Unknown'}`)
    );
  }

  return uris;
}
