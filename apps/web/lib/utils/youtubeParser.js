/**
 * YouTube Title Parser
 * Extracts clean artist and song title from YouTube video titles
 * 
 * Common YouTube title formats:
 * - "Artist - Song Title"
 * - "Artist - Song Title (Official Video)"
 * - "Artist - Song Title [Official Music Video]"
 * - "Song Title | Artist"
 * - "Artist: Song Title"
 * - "Song Title (feat. Artist 2) - Artist"
 * - "Artist - Song Title ft. Artist 2"
 * - "Artist 'Song Title' Official Video"
 * - "【Artist】Song Title"
 */

// Patterns to remove from titles (case insensitive)
const NOISE_PATTERNS = [
  // Official/music video markers
  /\s*[\(\[\{]?\s*(official\s*)?(music\s*)?(video|audio|lyric[s]?|visualizer|mv|m\/v)\s*[\)\]\}]?\s*/gi,
  /\s*[\(\[\{]?\s*(official)\s*[\)\]\}]?\s*/gi,
  /\s*[\(\[\{]?\s*(hd|hq|4k|1080p|720p|uhd)\s*[\)\]\}]?\s*/gi,
  
  // Year markers
  /\s*[\(\[\{]?\s*(19|20)\d{2}\s*[\)\]\}]?\s*/gi,
  
  // Remaster/remix markers (keep feat./ft.)
  /\s*[\(\[\{]?\s*(remaster(ed)?|remix|extended|radio\s*edit|album\s*version)\s*[\)\]\}]?\s*/gi,
  
  // Premiere/new markers
  /\s*[\(\[\{]?\s*(premiere|new|exclusive)\s*[\)\]\}]?\s*/gi,
  
  // Platform markers
  /\s*[\(\[\{]?\s*(spotify|apple\s*music|youtube)\s*[\)\]\}]?\s*/gi,
  
  // Hashtags and misc
  /\s*#\w+/gi,
  /\s*[\(\[\{]?\s*(prod\.?\s*by|produced\s*by)\s+[^\)\]\}]+\s*[\)\]\}]?/gi,
  
  // Japanese/Korean brackets with content (but preserve artist names inside)
  /【[^】]*(?:official|video|audio|mv)[^】]*】/gi,
  /『[^』]*(?:official|video|audio|mv)[^』]*』/gi,
  
  // Clean up multiple spaces
  /\s{2,}/g,
];

// Common VEVO/official channel suffixes to remove from artist names
const CHANNEL_SUFFIXES = [
  /vevo$/i,
  /\s*-?\s*topic$/i,
  /official$/i,
  /\s*music$/i,
  /\s*channel$/i,
  /\s*records$/i,
];

// Separators that indicate "Artist - Title" format
const TITLE_SEPARATORS = [
  ' - ',      // Most common
  ' – ',      // En dash
  ' — ',      // Em dash
  ' | ',      // Pipe
  ' // ',     // Double slash
  ': ',       // Colon (less reliable)
  ' ~ ',      // Tilde
];

// Feature patterns to extract featured artists
const FEAT_PATTERNS = [
  /\s*[\(\[\{]?\s*(?:feat\.?|ft\.?|featuring)\s+([^\)\]\}]+)\s*[\)\]\}]?/gi,
  /\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/gi,
];

/**
 * Clean noise from a string
 */
function cleanNoise(str) {
  let result = str;
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  return result.trim();
}

/**
 * Clean channel name to get artist name
 */
function cleanChannelName(channel) {
  if (!channel) return null;
  let result = channel;
  for (const suffix of CHANNEL_SUFFIXES) {
    result = result.replace(suffix, '');
  }
  return result.trim() || null;
}

/**
 * Extract featured artists from title
 */
function extractFeaturedArtists(title) {
  const featured = [];
  let cleanTitle = title;
  
  for (const pattern of FEAT_PATTERNS) {
    const match = cleanTitle.match(pattern);
    if (match && match[1]) {
      featured.push(match[1].trim());
      cleanTitle = cleanTitle.replace(pattern, '');
    }
  }
  
  return { cleanTitle: cleanTitle.trim(), featured };
}

/**
 * Try to split title into artist and song using separators
 */
function splitBySeperator(title) {
  for (const sep of TITLE_SEPARATORS) {
    const parts = title.split(sep);
    if (parts.length >= 2) {
      // First part is usually artist, rest is song title
      const artist = parts[0].trim();
      const songTitle = parts.slice(1).join(sep).trim();
      
      // Validate: artist shouldn't be too long or contain typical title words
      if (artist.length > 0 && artist.length < 50 && songTitle.length > 0) {
        return { artist, title: songTitle };
      }
    }
  }
  return null;
}

/**
 * Parse a YouTube video title to extract artist and song title
 * 
 * @param {string} rawTitle - The raw YouTube video title
 * @param {string} channelName - The YouTube channel name (optional, used as fallback)
 * @returns {{ artist: string, title: string, featured: string[], confidence: 'high' | 'medium' | 'low' }}
 */
export function parseYouTubeTitle(rawTitle, channelName = null) {
  if (!rawTitle) {
    return {
      artist: channelName ? cleanChannelName(channelName) : 'Unknown',
      title: 'Unknown',
      featured: [],
      confidence: 'low',
    };
  }

  // Step 1: Clean noise from the title
  let cleanedTitle = cleanNoise(rawTitle);
  
  // Step 2: Extract featured artists
  const { cleanTitle: titleWithoutFeat, featured } = extractFeaturedArtists(cleanedTitle);
  cleanedTitle = titleWithoutFeat;
  
  // Step 3: Try to split by separator
  const splitResult = splitBySeperator(cleanedTitle);
  
  if (splitResult) {
    // Successfully parsed "Artist - Title" format
    let artist = splitResult.artist;
    let title = splitResult.title;
    
    // Clean the artist name too (remove noise)
    artist = cleanNoise(artist);
    title = cleanNoise(title);
    
    // If we have featured artists, add them
    if (featured.length > 0) {
      artist = `${artist} feat. ${featured.join(', ')}`;
    }
    
    return {
      artist,
      title,
      featured,
      confidence: 'high',
    };
  }
  
  // Step 4: Fallback - use channel name as artist, cleaned title as song
  const fallbackArtist = cleanChannelName(channelName) || 'Unknown';
  
  // Remove Japanese/Korean brackets that might contain artist name
  let fallbackTitle = cleanedTitle
    .replace(/^【[^】]+】\s*/, '')  // Remove 【Artist】 prefix
    .replace(/^『[^』]+』\s*/, '')  // Remove 『Artist』 prefix
    .replace(/\s*【[^】]+】$/, '')  // Remove 【suffix】
    .replace(/\s*『[^』]+』$/, '')  // Remove 『suffix』
    .trim();
  
  // If title is empty after cleaning, use original
  if (!fallbackTitle) {
    fallbackTitle = cleanedTitle || rawTitle;
  }
  
  return {
    artist: fallbackArtist,
    title: fallbackTitle,
    featured,
    confidence: channelName ? 'medium' : 'low',
  };
}

/**
 * Batch parse multiple YouTube titles
 * 
 * @param {Array<{ title: string, channelName?: string }>} items
 * @returns {Array<{ artist: string, title: string, featured: string[], confidence: string }>}
 */
export function parseYouTubeTitles(items) {
  return items.map(item => parseYouTubeTitle(item.title, item.channelName));
}

/**
 * Normalize an artist name for comparison/matching
 * Useful for deduplication and Last.fm lookups
 */
export function normalizeArtistName(artist) {
  if (!artist) return '';
  return artist
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Normalize a song title for comparison/matching
 */
export function normalizeSongTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

export default {
  parseYouTubeTitle,
  parseYouTubeTitles,
  normalizeArtistName,
  normalizeSongTitle,
};

