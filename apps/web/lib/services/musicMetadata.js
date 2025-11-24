/**
 * Music Metadata Service
 * Fetches genre, popularity, and audio features from multiple APIs:
 * - Spotify API (for Spotify tracks)
 * - Last.fm API (for both Spotify and YouTube tracks)
 * - MusicBrainz API (for both Spotify and YouTube tracks)
 */

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2/';

/**
 * Fetch track features from Spotify API
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} Track features including genres, popularity, and audio features
 */
export async function fetchSpotifyTrackFeatures(trackId, accessToken) {
  try {
    // Fetch track details (includes popularity)
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!trackResponse.ok) {
      throw new Error(`Spotify track API error: ${trackResponse.status}`);
    }

    const trackData = await trackResponse.json();

    // Fetch audio features
    const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let audioFeatures = {};
    if (featuresResponse.ok) {
      audioFeatures = await featuresResponse.json();
    }

    // Get genres from artist
    let genres = [];
    if (trackData.artists && trackData.artists.length > 0) {
      const artistId = trackData.artists[0].id;
      const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (artistResponse.ok) {
        const artistData = await artistResponse.json();
        genres = artistData.genres || [];
      }
    }

    return {
      genres,
      popularity: trackData.popularity || 0,
      artist: trackData.artists?.map(a => a.name).join(', ') || '',
      title: trackData.name || '',
      audioFeatures: {
        danceability: audioFeatures.danceability,
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        tempo: audioFeatures.tempo,
        key: audioFeatures.key,
        mode: audioFeatures.mode,
      },
      source: 'spotify',
    };
  } catch (error) {
    console.error('[musicMetadata] Spotify API error:', error);
    return null;
  }
}

/**
 * Fetch track info from Last.fm API
 * @param {string} artist - Artist name
 * @param {string} title - Track title
 * @returns {Promise<Object>} Track info including tags (genres) and play count
 */
export async function fetchLastFmTrackInfo(artist, title) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.warn('[musicMetadata] Last.fm API key not configured');
    return null;
  }

  try {
    // Rate limiting: Last.fm allows 5 requests per second
    await new Promise(resolve => setTimeout(resolve, 200));

    const params = new URLSearchParams({
      method: 'track.getInfo',
      api_key: apiKey,
      artist: artist,
      track: title,
      format: 'json',
    });

    const response = await fetch(`${LASTFM_API_BASE}?${params.toString()}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Track not found
      }
      throw new Error(`Last.fm API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return null; // Track not found or error
    }

    const track = data.track;
    const tags = track.toptags?.tag || [];
    const genres = tags
      .filter(tag => tag.name)
      .map(tag => tag.name.toLowerCase())
      .slice(0, 10); // Top 10 tags for better genre coverage

    // Last.fm play count is a strong indicator of popularity and relatability
    const playCount = parseInt(track.playcount || '0', 10);
    
    return {
      genres,
      popularity: playCount, // Keep raw play count for better analysis (can normalize later)
      playCount: playCount, // Also include as separate field for clarity
      artist: track.artist?.name || artist,
      title: track.name || title,
      source: 'lastfm',
    };
  } catch (error) {
    console.error('[musicMetadata] Last.fm API error:', error);
    return null;
  }
}

/**
 * Fetch metadata from MusicBrainz API
 * @param {string} artist - Artist name
 * @param {string} title - Track title
 * @returns {Promise<Object>} Metadata including genre tags
 */
export async function fetchMusicBrainzMetadata(artist, title) {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'Vybe/1.0 (https://vybe.app)';
  
  try {
    // Rate limiting: ensure at least 1 second between requests
    const now = Date.now();
    const timeSinceLastRequest = now - musicBrainzLastRequest;
    if (timeSinceLastRequest < MUSICBRAINZ_MIN_DELAY) {
      await new Promise(resolve => setTimeout(resolve, MUSICBRAINZ_MIN_DELAY - timeSinceLastRequest));
    }
    musicBrainzLastRequest = Date.now();

    // Search for recording
    const searchParams = new URLSearchParams({
      query: `artist:"${artist}" AND recording:"${title}"`,
      limit: '1',
      fmt: 'json',
    });

    const searchResponse = await fetch(`${MUSICBRAINZ_API_BASE}recording/?${searchParams.toString()}`, {
      headers: {
        'User-Agent': userAgent,
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`MusicBrainz API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.recordings || searchData.recordings.length === 0) {
      return null;
    }

    const recording = searchData.recordings[0];

    // Get tags/genres from recording
    const tagsResponse = await fetch(`${MUSICBRAINZ_API_BASE}recording/${recording.id}?inc=tags&fmt=json`, {
      headers: {
        'User-Agent': userAgent,
      },
    });

    let genres = [];
    if (tagsResponse.ok) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      const tagsData = await tagsResponse.json();
      const tags = tagsData.tags || [];
      genres = tags
        .filter(tag => tag.count > 0)
        .sort((a, b) => b.count - a.count)
        .map(tag => tag.name.toLowerCase())
        .slice(0, 5);
    }

    return {
      genres,
      popularity: 0, // MusicBrainz doesn't provide popularity scores
      artist: recording['artist-credit']?.[0]?.name || artist,
      title: recording.title || title,
      source: 'musicbrainz',
    };
  } catch (error) {
    console.error('[musicMetadata] MusicBrainz API error:', error);
    return null;
  }
}

/**
 * Get unified track metadata from all available sources
 * Tries Spotify first (if available), then Last.fm, then MusicBrainz
 * @param {Object} song - Song object with title, artist, external_id, etc.
 * @param {string} platform - 'spotify' or 'youtube'
 * @param {string} spotifyToken - Spotify access token (optional)
 * @returns {Promise<Object>} Combined metadata with best available data
 */
export async function getTrackMetadata(song, platform, spotifyToken = null) {
  const { title, artist, external_id } = song;

  if (!title || !artist) {
    return {
      genres: [],
      popularity: 0,
      artist: artist || 'Unknown Artist',
      title: title || 'Unknown Title',
      audioFeatures: {},
      sources: [],
    };
  }

  let metadata = {
    genres: [],
    popularity: 0,
    artist: artist,
    title: title,
    audioFeatures: {},
    sources: [],
  };

  // Try Spotify API first (if it's a Spotify track and we have a token)
  if (platform === 'spotify' && external_id && spotifyToken) {
    const spotifyData = await fetchSpotifyTrackFeatures(external_id, spotifyToken);
    if (spotifyData) {
      metadata = {
        ...metadata,
        ...spotifyData,
        sources: ['spotify'],
      };
    }
  }

  // Try Last.fm API (works for both Spotify and YouTube)
  const lastFmData = await fetchLastFmTrackInfo(artist, title);
  if (lastFmData) {
    // Merge genres (avoid duplicates)
    const existingGenres = new Set(metadata.genres.map(g => g.toLowerCase()));
    const newGenres = lastFmData.genres.filter(g => !existingGenres.has(g.toLowerCase()));
    metadata.genres = [...metadata.genres, ...newGenres];

    // Use Last.fm play count for popularity/relatability analysis
    // Keep raw play count for better comparison - OpenAI can analyze relative popularity
    if (lastFmData.playCount > 0) {
      // If we have Spotify popularity (0-100), use it; otherwise use Last.fm play count
      if (metadata.popularity === 0 || !metadata.sources.includes('spotify')) {
        metadata.popularity = lastFmData.playCount; // Use raw play count for analysis
      }
      metadata.lastFmPlayCount = lastFmData.playCount; // Include for reference
    }

    metadata.sources.push('lastfm');
  }

  // Try MusicBrainz API (works for both Spotify and YouTube)
  const musicBrainzData = await fetchMusicBrainzMetadata(artist, title);
  if (musicBrainzData) {
    // Merge genres (avoid duplicates)
    const existingGenres = new Set(metadata.genres.map(g => g.toLowerCase()));
    const newGenres = musicBrainzData.genres.filter(g => !existingGenres.has(g.toLowerCase()));
    metadata.genres = [...metadata.genres, ...newGenres];

    metadata.sources.push('musicbrainz');
  }

  return metadata;
}

/**
 * Batch fetch metadata for multiple songs with rate limiting
 * @param {Array} songs - Array of song objects
 * @param {string} platform - 'spotify' or 'youtube'
 * @param {string} spotifyToken - Spotify access token (optional)
 * @returns {Promise<Array>} Array of metadata objects
 */
export async function getBatchTrackMetadata(songs, platform, spotifyToken = null) {
  const results = [];
  
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const metadata = await getTrackMetadata(song, platform, spotifyToken);
    results.push({
      songId: song.id,
      ...metadata,
    });

    // Progress logging for large batches
    if ((i + 1) % 10 === 0) {
      console.log(`[musicMetadata] Processed ${i + 1}/${songs.length} songs`);
    }
  }

  return results;
}

