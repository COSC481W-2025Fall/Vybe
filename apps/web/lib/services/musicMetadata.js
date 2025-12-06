/**
 * Music Metadata Service
 * Fetches genre, popularity, and audio features from multiple APIs:
 * - Spotify API (for Spotify tracks)
 * - Last.fm API (for both Spotify and YouTube tracks)
 * - MusicBrainz API (for both Spotify and YouTube tracks)
 * 
 * Features smart caching:
 * - Checks database for cached metadata before API calls
 * - Parses YouTube titles for better artist/song matching
 * - Saves metadata to database for future use
 */

import { parseYouTubeTitle } from '@/lib/utils/youtubeParser';

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';

// Metadata cache "freshness" check (30 days)
// NOTE: This is for checking if we should RE-FETCH from APIs - the database stores data PERMANENTLY
// Data older than 30 days will be re-fetched to get updated popularity/genres, but old data is never deleted
const METADATA_CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2/';
const MUSICBRAINZ_MIN_DELAY = 1000; // 1 second between requests
const MUSICBRAINZ_MAX_RETRIES = 2; // Maximum retries per request
const MUSICBRAINZ_CIRCUIT_BREAKER_THRESHOLD = 5; // Disable after 5 consecutive failures
const MUSICBRAINZ_CIRCUIT_BREAKER_RESET_TIME = 60000; // Reset after 60 seconds

// Track last MusicBrainz request time for rate limiting
let musicBrainzLastRequest = 0;

// Circuit breaker state
let musicBrainzFailureCount = 0;
let musicBrainzLastFailureTime = 0;
let musicBrainzCircuitOpen = false;

/**
 * Fetch track features from Spotify API
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} Track features including genres, popularity, and audio features
 */
/**
 * Helper to check if Spotify response is 401 (expired token)
 */
function isSpotify401Error(response) {
  return response && response.status === 401;
}

export async function fetchSpotifyTrackFeatures(trackId, accessToken) {
  // Early return if no token
  if (!accessToken) {
    return null;
  }

  try {
    // Fetch track details (includes popularity)
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!trackResponse.ok) {
      // Handle 401 (unauthorized/expired token) gracefully - don't log as error
      if (isSpotify401Error(trackResponse)) {
        // Don't log every 401 - it's expected when tokens expire
        return null; // Return null to allow fallback to Last.fm
      }
      // Other errors - log but don't throw
      console.warn(`[musicMetadata] Spotify track API error ${trackResponse.status} for ${trackId}`);
      return null;
    }

    const trackData = await trackResponse.json();

    // Fetch audio features (optional - continue even if this fails)
    let audioFeatures = {};
    try {
      const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (isSpotify401Error(featuresResponse)) {
        // Token expired during request - return what we have so far
        return {
          genres: [],
          popularity: trackData.popularity || 0,
          artist: trackData.artists?.map(a => a.name).join(', ') || '',
          title: trackData.name || '',
          audioFeatures: {},
          source: 'spotify',
        };
      }

      if (featuresResponse.ok) {
        audioFeatures = await featuresResponse.json();
      }
    } catch (error) {
      // Audio features fetch failed - not critical, continue without them
      if (!error.message?.includes('401')) {
        console.warn(`[musicMetadata] Spotify audio features fetch failed for ${trackId}:`, error.message);
      }
    }

    // Get genres from artist (optional - continue even if this fails)
    let genres = [];
    if (trackData.artists && trackData.artists.length > 0) {
      try {
        const artistId = trackData.artists[0].id;
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (isSpotify401Error(artistResponse)) {
          // Token expired - return what we have
          return {
            genres: [],
            popularity: trackData.popularity || 0,
            artist: trackData.artists?.map(a => a.name).join(', ') || '',
            title: trackData.name || '',
            audioFeatures,
            source: 'spotify',
          };
        }

        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          genres = artistData.genres || [];
        }
      } catch (error) {
        // Artist fetch failed - not critical, continue without genres
        if (!error.message?.includes('401')) {
          console.warn(`[musicMetadata] Spotify artist fetch failed for ${trackId}:`, error.message);
        }
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
    // Catch any unexpected errors - don't log 401 errors as they're expected
    if (!error.message?.includes('401') && !error.message?.includes('Unauthorized')) {
      console.warn(`[musicMetadata] Spotify API error for ${trackId}:`, error.message);
    }
    return null; // Always return null instead of throwing
  }
}

/**
 * Search Spotify for a track and get its metadata
 * Useful for YouTube songs to get Spotify popularity data
 * @param {string} artist - Artist name
 * @param {string} title - Track title  
 * @param {string} accessToken - Spotify access token
 * @param {string} originalTitle - Original YouTube title (fallback search)
 * @returns {Promise<Object|null>} Track metadata or null
 */
export async function searchSpotifyTrack(artist, title, accessToken, originalTitle = null) {
  if (!accessToken) return null;

  try {
    // Try cleaned title first
    let query = `track:${title}`;
    if (artist && artist !== 'Unknown' && artist !== 'Unknown Artist') {
      query += ` artist:${artist}`;
    }

    console.log(`[musicMetadata] 🔍 Spotify search: "${query}"`);

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (isSpotify401Error(searchResponse)) {
      return null;
    }

    if (!searchResponse.ok) {
      console.warn(`[musicMetadata] Spotify search error: ${searchResponse.status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    let tracks = searchData.tracks?.items || [];

    // If no results with cleaned title and we have original, try that
    if (tracks.length === 0 && originalTitle && originalTitle !== title) {
      console.log(`[musicMetadata] 🔍 Spotify fallback search with original: "${originalTitle}"`);
      
      const fallbackResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(originalTitle)}&type=track&limit=5`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        tracks = fallbackData.tracks?.items || [];
      }
    }

    if (tracks.length === 0) {
      console.log(`[musicMetadata] ⚠️ No Spotify results for "${title}" by ${artist}`);
      return null;
    }

    // Find best match - prefer exact artist match
    let bestMatch = tracks[0];
    for (const track of tracks) {
      const trackArtists = track.artists?.map(a => a.name.toLowerCase()) || [];
      if (artist && trackArtists.includes(artist.toLowerCase())) {
        bestMatch = track;
        break;
      }
    }

    console.log(`[musicMetadata] ✅ Spotify match: "${bestMatch.name}" by ${bestMatch.artists?.[0]?.name} (popularity: ${bestMatch.popularity})`);

    // Get artist genres
    let genres = [];
    if (bestMatch.artists?.[0]?.id) {
      try {
        const artistResponse = await fetch(
          `https://api.spotify.com/v1/artists/${bestMatch.artists[0].id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          genres = artistData.genres || [];
        }
      } catch (e) {
        // Continue without genres
      }
    }

    return {
      spotifyId: bestMatch.id,
      title: bestMatch.name,
      artist: bestMatch.artists?.map(a => a.name).join(', ') || artist,
      popularity: bestMatch.popularity || 0,
      genres,
      album: bestMatch.album?.name,
      source: 'spotify_search',
    };
  } catch (error) {
    console.warn(`[musicMetadata] Spotify search error:`, error.message);
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
    // Rate limiting: Last.fm allows 5 requests per second (200ms between requests)
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
      // Handle rate limiting (429) with retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '1';
        const delay = parseInt(retryAfter, 10) * 1000;
        console.warn(`[musicMetadata] Last.fm rate limited, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Retry once
        try {
          const retryResponse = await fetch(`${LASTFM_API_BASE}?${params.toString()}`);
          if (!retryResponse.ok) {
            if (retryResponse.status === 404) return null;
            if (retryResponse.status === 503) {
              console.warn('[musicMetadata] Last.fm API temporarily unavailable (503), skipping...');
              return null;
            }
            throw new Error(`Last.fm API error: ${retryResponse.status}`);
          }
          const retryData = await retryResponse.json();
          if (retryData.error) return null;
          const track = retryData.track;
          const tags = track.toptags?.tag || [];
          const genres = tags
            .filter(tag => tag.name)
            .map(tag => tag.name.toLowerCase())
            .slice(0, 10);
          const playCount = parseInt(track.playcount || '0', 10);
          return {
            genres,
            popularity: playCount,
            playCount: playCount,
            artist: track.artist?.name || artist,
            title: track.name || title,
            source: 'lastfm',
          };
        } catch (retryError) {
          console.warn('[musicMetadata] Last.fm retry failed, skipping...');
          return null; // Don't block metadata fetching if Last.fm fails
        }
      }
      // Handle 503 (Service Unavailable) gracefully
      if (response.status === 503) {
        console.warn('[musicMetadata] Last.fm API temporarily unavailable (503), skipping...');
        return null; // Don't block metadata fetching
      }
      // For other errors, log but don't throw - allow other sources to work
      console.warn(`[musicMetadata] Last.fm API error: ${response.status}, skipping...`);
      return null;
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
    // Handle network/timeout errors gracefully
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout')) {
      console.warn('[musicMetadata] Last.fm API network error, skipping...');
      return null;
    }
    // Handle 503/429 errors gracefully
    if (error.message?.includes('503') || error.message?.includes('429')) {
      console.warn('[musicMetadata] Last.fm API temporarily unavailable, skipping...');
      return null;
    }
    console.error('[musicMetadata] Last.fm API error:', error);
    return null; // Always return null instead of throwing - don't block other metadata sources
  }
}

/**
 * Fetch metadata from MusicBrainz API with circuit breaker and retry logic
 * @param {string} artist - Artist name
 * @param {string} title - Track title
 * @returns {Promise<Object|null>} Metadata including genre tags, or null on failure
 */
export async function fetchMusicBrainzMetadata(artist, title) {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'Vybe/1.0 (https://vybe.app)';
  
  // Check circuit breaker
  const now = Date.now();
  if (musicBrainzCircuitOpen) {
    // Check if we should reset the circuit breaker
    if (now - musicBrainzLastFailureTime > MUSICBRAINZ_CIRCUIT_BREAKER_RESET_TIME) {
      musicBrainzCircuitOpen = false;
      musicBrainzFailureCount = 0;
      console.log('[musicMetadata] MusicBrainz circuit breaker reset - attempting requests again');
    } else {
      // Circuit is open, skip MusicBrainz
      return null;
    }
  }
  
  try {
    // Rate limiting: ensure at least 1 second between requests
    const timeSinceLastRequest = now - musicBrainzLastRequest;
    if (timeSinceLastRequest < MUSICBRAINZ_MIN_DELAY) {
      await new Promise(resolve => setTimeout(resolve, MUSICBRAINZ_MIN_DELAY - timeSinceLastRequest));
    }
    musicBrainzLastRequest = Date.now();

    // Retry logic with exponential backoff
    let lastError = null;
    for (let attempt = 0; attempt <= MUSICBRAINZ_MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s
          const backoffDelay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[musicMetadata] MusicBrainz retry attempt ${attempt}/${MUSICBRAINZ_MAX_RETRIES} after ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        // Search for recording
        const searchParams = new URLSearchParams({
          query: `artist:"${artist}" AND recording:"${title}"`,
          limit: '1',
          fmt: 'json',
        });

        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const searchResponse = await fetch(`${MUSICBRAINZ_API_BASE}recording/?${searchParams.toString()}`, {
          headers: {
            'User-Agent': userAgent,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!searchResponse.ok) {
          // Handle 503 (Service Unavailable) and 429 (Rate Limit) gracefully
          if (searchResponse.status === 503 || searchResponse.status === 429) {
            if (attempt < MUSICBRAINZ_MAX_RETRIES) {
              lastError = new Error(`MusicBrainz API ${searchResponse.status}`);
              continue; // Retry
            }
            // Max retries reached, give up gracefully
            console.warn(`[musicMetadata] MusicBrainz API ${searchResponse.status === 503 ? 'unavailable' : 'rate limited'} after ${attempt + 1} attempts, skipping...`);
            musicBrainzFailureCount++;
            if (musicBrainzFailureCount >= MUSICBRAINZ_CIRCUIT_BREAKER_THRESHOLD) {
              musicBrainzCircuitOpen = true;
              musicBrainzLastFailureTime = Date.now();
              console.warn(`[musicMetadata] MusicBrainz circuit breaker opened after ${musicBrainzFailureCount} failures`);
            }
            return null;
          }
          
          // Other errors - don't retry, just fail gracefully
          console.warn(`[musicMetadata] MusicBrainz API error ${searchResponse.status}, skipping...`);
          return null;
        }

        const searchData = await searchResponse.json();

        if (!searchData.recordings || searchData.recordings.length === 0) {
          // No results found - this is not an error, just no data
          return null;
        }

        const recording = searchData.recordings[0];

        // Get tags/genres from recording (with timeout)
        try {
          // Create timeout controller for tags request
          const tagsController = new AbortController();
          const tagsTimeoutId = setTimeout(() => tagsController.abort(), 5000); // 5 second timeout
          
          const tagsResponse = await fetch(`${MUSICBRAINZ_API_BASE}recording/${recording.id}?inc=tags&fmt=json`, {
            headers: {
              'User-Agent': userAgent,
            },
            signal: tagsController.signal,
          });
          
          clearTimeout(tagsTimeoutId);

          let genres = [];
          if (tagsResponse.ok) {
            // Rate limit between requests
            await new Promise(resolve => setTimeout(resolve, MUSICBRAINZ_MIN_DELAY));
            
            try {
              const tagsData = await tagsResponse.json();
              const tags = tagsData.tags || [];
              genres = tags
                .filter(tag => tag.count > 0)
                .sort((a, b) => b.count - a.count)
                .map(tag => tag.name.toLowerCase())
                .slice(0, 5);
            } catch (error) {
              console.warn('[musicMetadata] Error parsing MusicBrainz tags response:', error.message);
              // Continue without tags - not critical
            }
          } else if (tagsResponse.status === 503 || tagsResponse.status === 429) {
            console.warn('[musicMetadata] MusicBrainz tags API unavailable, continuing without tags...');
            // Continue without tags - not critical
          }
        } catch (error) {
          // Tags fetch failed - not critical, continue without tags
          if (error.name !== 'AbortError') {
            console.warn('[musicMetadata] MusicBrainz tags fetch failed:', error.message);
          }
        }

        // Success! Reset failure count
        musicBrainzFailureCount = 0;
        
        return {
          genres,
          popularity: 0, // MusicBrainz doesn't provide popularity scores
          artist: recording['artist-credit']?.[0]?.name || artist,
          title: recording.title || title,
          source: 'musicbrainz',
        };
      } catch (error) {
        lastError = error;
        
        // Handle timeout and network errors
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          if (attempt < MUSICBRAINZ_MAX_RETRIES) {
            continue; // Retry on timeout
          }
          console.warn('[musicMetadata] MusicBrainz request timed out after retries, skipping...');
        } else if (error.message?.includes('503') || error.message?.includes('429')) {
          if (attempt < MUSICBRAINZ_MAX_RETRIES) {
            continue; // Retry on 503/429
          }
        } else {
          // Other errors - don't retry
          console.warn(`[musicMetadata] MusicBrainz error: ${error.message}, skipping...`);
          return null;
        }
      }
    }

    // All retries exhausted
    musicBrainzFailureCount++;
    if (musicBrainzFailureCount >= MUSICBRAINZ_CIRCUIT_BREAKER_THRESHOLD) {
      musicBrainzCircuitOpen = true;
      musicBrainzLastFailureTime = Date.now();
      console.warn(`[musicMetadata] MusicBrainz circuit breaker opened after ${musicBrainzFailureCount} failures`);
    }
    
    console.warn(`[musicMetadata] MusicBrainz failed after ${MUSICBRAINZ_MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`);
    return null;
  } catch (error) {
    // Catch-all for any unexpected errors
    console.warn(`[musicMetadata] MusicBrainz unexpected error: ${error.message}, skipping...`);
    musicBrainzFailureCount++;
    if (musicBrainzFailureCount >= MUSICBRAINZ_CIRCUIT_BREAKER_THRESHOLD) {
      musicBrainzCircuitOpen = true;
      musicBrainzLastFailureTime = Date.now();
    }
    return null; // Always return null instead of throwing
  }
}

/**
 * Check if cached metadata is still valid
 */
function isCacheValid(fetchedAt) {
  if (!fetchedAt) return false;
  const fetchedTime = new Date(fetchedAt).getTime();
  return Date.now() - fetchedTime < METADATA_CACHE_DURATION_MS;
}

/**
 * Get cached metadata from database
 * @param {Object} supabase - Supabase client
 * @param {string} songId - Song ID
 * @returns {Promise<Object|null>} Cached metadata or null
 */
export async function getCachedMetadata(supabase, songId) {
  if (!supabase || !songId) return null;
  
  try {
    const { data, error } = await supabase
      .from('playlist_songs')
      .select('genres, popularity, audio_features, metadata_source, metadata_fetched_at, parsed_title, parsed_artist')
      .eq('id', songId)
      .single();
    
    if (error || !data) return null;
    
    // Check if cache is valid
    if (!isCacheValid(data.metadata_fetched_at)) {
      console.log(`[musicMetadata] 📦 Cache expired for song ${songId}`);
      return null;
    }
    
    // Check if we actually have useful metadata
    if ((!data.genres || data.genres.length === 0) && data.popularity === 0) {
      console.log(`[musicMetadata] 📦 Cache exists but empty for song ${songId}`);
      return null;
    }
    
    console.log(`[musicMetadata] 📦 Cache HIT for song ${songId}: genres=${data.genres?.length || 0}, popularity=${data.popularity || 0}`);
    
    return {
      genres: data.genres || [],
      popularity: data.popularity || 0,
      audioFeatures: data.audio_features || {},
      sources: data.metadata_source ? [data.metadata_source] : ['cache'],
      parsedTitle: data.parsed_title,
      parsedArtist: data.parsed_artist,
      fromCache: true,
    };
  } catch (error) {
    console.warn(`[musicMetadata] Cache check error for song ${songId}:`, error.message);
    return null;
  }
}

/**
 * Save metadata to database cache
 * @param {Object} supabase - Supabase client
 * @param {string} songId - Song ID
 * @param {Object} metadata - Metadata to cache
 * @param {string} parsedTitle - Cleaned title (for YouTube)
 * @param {string} parsedArtist - Cleaned artist (for YouTube)
 */
export async function saveMetadataToCache(supabase, songId, metadata, parsedTitle = null, parsedArtist = null) {
  if (!supabase || !songId) return;
  
  try {
    const updateData = {
      genres: metadata.genres || [],
      popularity: metadata.popularity || 0,
      audio_features: metadata.audioFeatures || {},
      metadata_source: metadata.sources?.[0] || 'unknown',
      metadata_fetched_at: new Date().toISOString(),
    };
    
    // Only update parsed fields if provided
    if (parsedTitle) updateData.parsed_title = parsedTitle;
    if (parsedArtist) updateData.parsed_artist = parsedArtist;
    
    const { error } = await supabase
      .from('playlist_songs')
      .update(updateData)
      .eq('id', songId);
    
    if (error) {
      console.warn(`[musicMetadata] Failed to cache metadata for song ${songId}:`, error.message);
    } else {
      console.log(`[musicMetadata] 💾 Cached metadata for song ${songId}: genres=${metadata.genres?.length || 0}, popularity=${metadata.popularity || 0}`);
    }
  } catch (error) {
    console.warn(`[musicMetadata] Cache save error for song ${songId}:`, error.message);
  }
}

/**
 * Get metadata stats for a group (for health check)
 * @param {Object} supabase - Supabase client
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Stats about metadata coverage
 */
export async function getGroupMetadataStats(supabase, groupId) {
  if (!supabase || !groupId) return { total: 0, withMetadata: 0, percentage: 0 };
  
  try {
    // Get all playlist IDs for the group
    const { data: playlists } = await supabase
      .from('group_playlists')
      .select('id')
      .eq('group_id', groupId);
    
    if (!playlists || playlists.length === 0) {
      return { total: 0, withMetadata: 0, percentage: 0 };
    }
    
    const playlistIds = playlists.map(p => p.id);
    
    // Count total songs
    const { count: totalCount } = await supabase
      .from('playlist_songs')
      .select('id', { count: 'exact', head: true })
      .in('playlist_id', playlistIds);
    
    // Count songs with metadata
    const { count: withMetadataCount } = await supabase
      .from('playlist_songs')
      .select('id', { count: 'exact', head: true })
      .in('playlist_id', playlistIds)
      .not('metadata_fetched_at', 'is', null)
      .or('genres.cs.{}', 'popularity.gt.0');
    
    const total = totalCount || 0;
    const withMetadata = withMetadataCount || 0;
    const percentage = total > 0 ? Math.round((withMetadata / total) * 100) : 0;
    
    return { total, withMetadata, percentage };
  } catch (error) {
    console.warn('[musicMetadata] Failed to get metadata stats:', error.message);
    return { total: 0, withMetadata: 0, percentage: 0 };
  }
}

/**
 * Get unified track metadata from all available sources
 * Tries Spotify first (if available), then Last.fm, then MusicBrainz
 * All sources are non-blocking - if one fails, others continue
 * 
 * NEW: Uses smart caching and YouTube title parsing
 * 
 * @param {Object} song - Song object with title, artist, external_id, etc.
 * @param {string} platform - 'spotify' or 'youtube'
 * @param {string} spotifyToken - Spotify access token (optional)
 * @param {Object} supabase - Supabase client for caching (optional)
 * @returns {Promise<Object>} Combined metadata with best available data
 */
export async function getTrackMetadata(song, platform, spotifyToken = null, supabase = null) {
  const trackStartTime = Date.now();
  let { title, artist, external_id } = song;
  const songId = song.id;
  
  console.log(`[musicMetadata] 🎵 getTrackMetadata: Starting for "${title}" by ${artist || 'Unknown'} (platform: ${platform}, external_id: ${external_id || 'none'})`);

  // STEP 0: Check cache first (if supabase client provided)
  if (supabase && songId) {
    const cached = await getCachedMetadata(supabase, songId);
    if (cached) {
      const totalTime = ((Date.now() - trackStartTime) / 1000).toFixed(3);
      console.log(`[musicMetadata] ✅ Using cached metadata in ${totalTime}s`);
      return {
        ...cached,
        artist: cached.parsedArtist || artist,
        title: cached.parsedTitle || title,
      };
    }
  }

  // STEP 1: Parse YouTube titles for better matching
  let parsedTitle = null;
  let parsedArtist = null;
  
  if (platform === 'youtube') {
    const parsed = parseYouTubeTitle(title, artist);
    parsedTitle = parsed.title;
    parsedArtist = parsed.artist;
    
    console.log(`[musicMetadata] 🎬 YouTube title parsed: "${title}" -> artist="${parsedArtist}", title="${parsedTitle}" (confidence: ${parsed.confidence})`);
    
    // Use parsed values for API lookups
    if (parsed.confidence !== 'low') {
      title = parsedTitle;
      artist = parsedArtist;
    }
  }

  if (!title || !artist) {
    console.log(`[musicMetadata] ⚠️  getTrackMetadata: Missing title or artist, returning minimal metadata`);
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
    console.log(`[musicMetadata] 🎧 Attempting Spotify API for "${title}" (external_id: ${external_id})`);
    const spotifyStartTime = Date.now();
    const spotifyData = await fetchSpotifyTrackFeatures(external_id, spotifyToken);
    const spotifyTime = ((Date.now() - spotifyStartTime) / 1000).toFixed(3);
    
    if (spotifyData) {
      console.log(`[musicMetadata] ✅ Spotify API success in ${spotifyTime}s: genres=${spotifyData.genres?.length || 0}, popularity=${spotifyData.popularity || 0}, hasAudioFeatures=${!!spotifyData.audioFeatures}`);
      metadata = {
        ...metadata,
        ...spotifyData,
        sources: ['spotify'],
      };
    } else {
      console.log(`[musicMetadata] ⚠️  Spotify API returned null in ${spotifyTime}s (likely 401 or missing data), continuing with other sources`);
    }
    // If Spotify fails (401, etc.), fetchSpotifyTrackFeatures returns null
    // and we continue with Last.fm - no error thrown
  } else if (platform === 'youtube' && spotifyToken) {
    // For YouTube songs, search Spotify to get popularity data
    console.log(`[musicMetadata] 🔍 Searching Spotify for YouTube song: "${title}" by ${artist}`);
    const spotifyStartTime = Date.now();
    
    // Search using cleaned title/artist, with original as fallback
    const spotifySearchResult = await searchSpotifyTrack(
      artist,
      title,
      spotifyToken,
      song.title // Pass original title as fallback
    );
    
    const spotifyTime = ((Date.now() - spotifyStartTime) / 1000).toFixed(3);
    
    if (spotifySearchResult) {
      console.log(`[musicMetadata] ✅ Spotify search success in ${spotifyTime}s: popularity=${spotifySearchResult.popularity}, genres=${spotifySearchResult.genres?.length || 0}`);
      metadata = {
        ...metadata,
        popularity: spotifySearchResult.popularity || 0,
        genres: spotifySearchResult.genres || [],
        spotifyId: spotifySearchResult.spotifyId, // Store for future lookups
        sources: ['spotify_search'],
      };
    } else {
      console.log(`[musicMetadata] ⚠️  Spotify search returned null in ${spotifyTime}s, continuing with other sources`);
    }
  } else {
    console.log(`[musicMetadata] ⏭️  Skipping Spotify API: platform=${platform}, hasExternalId=${!!external_id}, hasToken=${!!spotifyToken}`);
  }

  // Try Last.fm API (works for both Spotify and YouTube)
  // For YouTube, use the parsed title/artist for better matching
  const lookupArtist = platform === 'youtube' ? (parsedArtist || artist) : artist;
  const lookupTitle = platform === 'youtube' ? (parsedTitle || title) : title;
  
  console.log(`[musicMetadata] 🎤 Attempting Last.fm API for "${lookupTitle}" by ${lookupArtist}`);
  const lastFmStartTime = Date.now();
  const lastFmData = await fetchLastFmTrackInfo(lookupArtist, lookupTitle);
  const lastFmTime = ((Date.now() - lastFmStartTime) / 1000).toFixed(3);
  
  if (lastFmData) {
    console.log(`[musicMetadata] ✅ Last.fm API success in ${lastFmTime}s: genres=${lastFmData.genres?.length || 0}, playCount=${lastFmData.playCount || 0}`);
    // Merge genres (avoid duplicates)
    const existingGenres = new Set(metadata.genres.map(g => g.toLowerCase()));
    const newGenres = lastFmData.genres.filter(g => !existingGenres.has(g.toLowerCase()));
    metadata.genres = [...metadata.genres, ...newGenres];
    console.log(`[musicMetadata]    Merged genres: ${metadata.genres.length} total (${newGenres.length} new from Last.fm)`);

    // Use Last.fm play count for popularity/relatability analysis
    // Keep raw play count for better comparison - OpenAI can analyze relative popularity
    if (lastFmData.playCount > 0) {
      // If we have Spotify popularity (0-100), use it; otherwise use Last.fm play count
      if (metadata.popularity === 0 || !metadata.sources.includes('spotify')) {
        metadata.popularity = lastFmData.playCount; // Use raw play count for analysis
        console.log(`[musicMetadata]    Set popularity to Last.fm playCount: ${lastFmData.playCount}`);
      } else {
        console.log(`[musicMetadata]    Keeping Spotify popularity: ${metadata.popularity} (Last.fm playCount: ${lastFmData.playCount} for reference)`);
      }
      metadata.lastFmPlayCount = lastFmData.playCount; // Include for reference
    }

    metadata.sources.push('lastfm');
  } else {
    console.log(`[musicMetadata] ⚠️  Last.fm API returned null in ${lastFmTime}s, continuing without Last.fm data`);
  }

  // Try MusicBrainz API (with circuit breaker and retry logic for resilience)
  // This is non-blocking - if it fails, we continue with other sources
  console.log(`[musicMetadata] 🎼 Attempting MusicBrainz API for "${title}" by ${artist}`);
  const musicBrainzStartTime = Date.now();
  try {
    const musicBrainzData = await fetchMusicBrainzMetadata(artist, title);
    const musicBrainzTime = ((Date.now() - musicBrainzStartTime) / 1000).toFixed(3);
    
    if (musicBrainzData && musicBrainzData.genres && musicBrainzData.genres.length > 0) {
      console.log(`[musicMetadata] ✅ MusicBrainz API success in ${musicBrainzTime}s: genres=${musicBrainzData.genres.length}`);
      // Merge genres (avoid duplicates)
      const existingGenres = new Set(metadata.genres.map(g => g.toLowerCase()));
      const newGenres = musicBrainzData.genres.filter(g => !existingGenres.has(g.toLowerCase()));
      metadata.genres = [...metadata.genres, ...newGenres];
      console.log(`[musicMetadata]    Merged genres: ${metadata.genres.length} total (${newGenres.length} new from MusicBrainz)`);

      metadata.sources.push('musicbrainz');
    } else {
      console.log(`[musicMetadata] ⚠️  MusicBrainz API returned null/no genres in ${musicBrainzTime}s`);
    }
  } catch (error) {
    const musicBrainzTime = ((Date.now() - musicBrainzStartTime) / 1000).toFixed(3);
    // MusicBrainz should never throw (always returns null), but just in case...
    console.warn(`[musicMetadata] ❌ MusicBrainz error (unexpected) in ${musicBrainzTime}s:`, error.message);
    // Continue without MusicBrainz data
  }

  const totalTime = ((Date.now() - trackStartTime) / 1000).toFixed(3);
  console.log(`[musicMetadata] ✅ getTrackMetadata complete in ${totalTime}s for "${title}": sources=[${metadata.sources.join(', ')}], genres=${metadata.genres.length}, popularity=${metadata.popularity}`);

  // STEP FINAL: Save to cache for future use (if supabase client provided)
  if (supabase && songId) {
    // Don't await - save in background to not slow down response
    saveMetadataToCache(supabase, songId, metadata, parsedTitle, parsedArtist).catch(err => {
      console.warn(`[musicMetadata] Background cache save failed:`, err.message);
    });
  }

  return metadata;
}

/**
 * Process songs in batches with concurrency control
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {number} concurrency - Max concurrent operations
 * @returns {Promise<Array>} Results array
 */
async function processBatch(items, processor, concurrency = 3) {
  const batchStartTime = Date.now();
  processBatch.startTime = batchStartTime;
  console.log(`[musicMetadata] 📦 Starting batch of ${items.length} items (concurrency: ${concurrency})`);
  
  const results = [];
  const executing = [];
  let completedCount = 0;
  let errorCount = 0;
  let lastLogTime = Date.now();
  const LOG_INTERVAL = 2000; // Log every 2 seconds
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    const promise = processor(item)
      .then(result => {
        executing.splice(executing.indexOf(promise), 1);
        completedCount++;
        return result;
      })
      .catch(error => {
        executing.splice(executing.indexOf(promise), 1);
        errorCount++;
        throw error;
      });
    
    results.push(promise);
    executing.push(promise);
    
    // Wait if we've hit concurrency limit (silently)
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
    
    // Periodic progress summary (every 2 seconds or every 20 items, whichever comes first)
    const now = Date.now();
    if (now - lastLogTime >= LOG_INTERVAL || (i + 1) % 20 === 0 || i === items.length - 1) {
      const elapsed = ((now - batchStartTime) / 1000).toFixed(1);
      const rate = completedCount > 0 ? (completedCount / elapsed).toFixed(1) : '0.0';
      const successRate = completedCount > 0 ? ((completedCount / (completedCount + errorCount)) * 100).toFixed(1) : '0.0';
      console.log(`[musicMetadata] 📊 ${i + 1}/${items.length} queued, ${completedCount} completed, ${errorCount} errors, ${executing.length} in flight (${rate}/s, ${successRate}% success)`);
      lastLogTime = now;
    }
  }
  
  // Wait for all remaining items
  const allResults = await Promise.all(results);
  const totalTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
  console.log(`[musicMetadata] ✅ Batch complete: ${completedCount} succeeded, ${errorCount} failed in ${totalTime}s`);
  
  return allResults;
}

/**
 * Batch fetch metadata for multiple songs with rate limiting and concurrency control
 * @param {Array} songs - Array of song objects
 * @param {string} platform - 'spotify' or 'youtube'
 * @param {string} spotifyToken - Spotify access token (optional)
 * @param {Object} options - Options for batch processing
 * @param {number} options.concurrency - Max concurrent requests (default: 5 for better performance)
 * @returns {Promise<Array>} Array of metadata objects
 */
export async function getBatchTrackMetadata(songs, platform, spotifyToken = null, options = {}) {
  // MAXIMUM CONCURRENCY - increased from 5 to 30 for maximum speed
  const { concurrency = 30 } = options;
  
  if (!songs || songs.length === 0) {
    console.log(`[musicMetadata] ⚠️  getBatchTrackMetadata: No songs provided, returning empty array`);
    return [];
  }
  
  const batchStartTime = Date.now();
  console.log(`[musicMetadata] 🚀 Starting batch metadata fetch for ${songs.length} songs`);
  console.log(`[musicMetadata]    Platform: ${platform}`);
  console.log(`[musicMetadata]    Concurrency: ${concurrency} (MAXIMUM)`);
  console.log(`[musicMetadata]    Spotify token: ${spotifyToken ? '✅ Available' : '❌ Not available'}`);
  console.log(`[musicMetadata]    First 3 songs:`, songs.slice(0, 3).map(s => ({ id: s.id, title: s.title, artist: s.artist })));
  
  processBatch.startTime = batchStartTime;
  const results = await processBatch(
    songs,
    async (song) => {
      const songStartTime = Date.now();
      console.log(`[musicMetadata] 🔍 Fetching metadata for song: "${song.title}" by ${song.artist || 'Unknown'} (ID: ${song.id})`);
      
      try {
        const metadata = await getTrackMetadata(song, platform, spotifyToken);
        const songTime = ((Date.now() - songStartTime) / 1000).toFixed(3);
        const sources = metadata.sources || [];
        console.log(`[musicMetadata] ✅ Got metadata for "${song.title}" in ${songTime}s (sources: ${sources.join(', ') || 'none'})`);
        
        return {
          songId: song.id,
          playlistId: song.playlistId || song.playlist_id,
          ...metadata,
        };
      } catch (error) {
        const songTime = ((Date.now() - songStartTime) / 1000).toFixed(3);
        console.error(`[musicMetadata] ❌ Error fetching metadata for song ${song.id} ("${song.title}") in ${songTime}s:`, error.message);
        console.error(`[musicMetadata]    Error stack:`, error.stack);
        
        // Return fallback metadata
        const fallback = {
          songId: song.id,
          playlistId: song.playlistId || song.playlist_id,
          title: song.title,
          artist: song.artist || 'Unknown Artist',
          genres: [],
          popularity: 0,
          audioFeatures: {},
          sources: [],
        };
        console.log(`[musicMetadata] 🔄 Returning fallback metadata for "${song.title}"`);
        return fallback;
      }
    },
    concurrency
  );
  
  const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
  const avgTime = (batchTime / songs.length).toFixed(3);
  
  // Count metadata sources
  const sourceStats = {};
  results.forEach(r => {
    r.sources?.forEach(s => {
      sourceStats[s] = (sourceStats[s] || 0) + 1;
    });
  });
  
  // Detailed result breakdown
  const withMetadata = results.filter(r => r.sources && r.sources.length > 0).length;
  const withGenres = results.filter(r => r.genres && r.genres.length > 0).length;
  const withPopularity = results.filter(r => r.popularity > 0).length;
  
  console.log(`[musicMetadata] ✅ Completed batch metadata fetch in ${batchTime}s (avg ${avgTime}s/song)`);
  console.log(`[musicMetadata]    Total songs: ${results.length}`);
  console.log(`[musicMetadata]    With metadata: ${withMetadata} (${((withMetadata/results.length)*100).toFixed(1)}%)`);
  console.log(`[musicMetadata]    With genres: ${withGenres} (${((withGenres/results.length)*100).toFixed(1)}%)`);
  console.log(`[musicMetadata]    With popularity: ${withPopularity} (${((withPopularity/results.length)*100).toFixed(1)}%)`);
  console.log(`[musicMetadata]    Source breakdown: ${JSON.stringify(sourceStats)}`);
  
  return results;
}

