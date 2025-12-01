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
 * Search for a track on Spotify by title and artist
 * @param {string} title - Track title
 * @param {string} artist - Track artist
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<string|null>} - Spotify track URI or null if not found
 */
export async function searchSpotifyTrack(title, artist, accessToken) {
  if (!title || !accessToken) return null;

  try {
    // Build search query
    let query = title;
    if (artist) {
      query = `${title} artist:${artist}`;
    }

    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.warn(`[spotifyExport] Search failed for "${title}": ${response.status}`);
      return null;
    }

    const data = await response.json();
    const tracks = data.tracks?.items;
    
    if (tracks && tracks.length > 0) {
      return tracks[0].uri; // Returns "spotify:track:..."
    }

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
