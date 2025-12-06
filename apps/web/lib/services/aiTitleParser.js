/**
 * AI-Powered Title Parser
 * Uses OpenAI to extract clean song metadata from messy YouTube titles
 * Falls back to heuristic parsing if AI is unavailable
 */

import OpenAI from 'openai';
import { parseYouTubeTitle } from '@/lib/utils/youtubeParser';

// In-memory cache for parsed titles to avoid redundant OpenAI API calls during a session
// NOTE: This is LOCAL memory cache only - database storage is permanent
const parseCache = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (for local memory only, not database)

// Rate limiting
let lastAICallTime = 0;
const MIN_AI_CALL_INTERVAL_MS = 100; // 10 calls per second max

/**
 * Clean cache of expired entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of parseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      parseCache.delete(key);
    }
  }
  
  // Also enforce max size
  if (parseCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(parseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    toDelete.forEach(([key]) => parseCache.delete(key));
  }
}

/**
 * Get cache key for a title
 */
function getCacheKey(title, channelName) {
  return `${title}|||${channelName || ''}`;
}

/**
 * Use OpenAI to parse a YouTube title into artist and song title
 * @param {string} rawTitle - The raw YouTube video title
 * @param {string} channelName - The YouTube channel name (optional)
 * @returns {Promise<{ artist: string, title: string, album?: string, featured?: string[], confidence: string }>}
 */
export async function parseWithAI(rawTitle, channelName = null) {
  // Check cache first
  const cacheKey = getCacheKey(rawTitle, channelName);
  const cached = parseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, fromCache: true };
  }
  
  // Check if we have OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.log('[aiTitleParser] No OpenAI API key, using heuristic parser');
    const heuristic = parseYouTubeTitle(rawTitle, channelName);
    return { ...heuristic, method: 'heuristic' };
  }
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastAICallTime;
  if (timeSinceLastCall < MIN_AI_CALL_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_AI_CALL_INTERVAL_MS - timeSinceLastCall));
  }
  lastAICallTime = Date.now();
  
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `Extract the song metadata from this YouTube video title. Return ONLY valid JSON.

YouTube Title: "${rawTitle}"
${channelName ? `Channel Name: "${channelName}"` : ''}

Return JSON with these fields:
{
  "artist": "primary artist name",
  "title": "song title only (no feat., no remix info, no video type)",
  "featured": ["featured artist 1", "featured artist 2"],
  "album": "album name if mentioned",
  "isRemix": true/false,
  "remixArtist": "name if remix"
}

Rules:
- Remove "(Official Video)", "[Official Audio]", "(Lyrics)", "(Music Video)" etc from title
- Extract featured artists from "feat.", "ft.", "featuring", "with", "&" etc
- The title should be ONLY the song name, nothing else
- If channel is "VEVO" channel, the artist is usually in the channel name
- If unsure, make your best guess based on common music naming patterns`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsed = JSON.parse(content);
    
    // Validate and format result
    const result = {
      artist: parsed.artist || channelName || 'Unknown',
      title: parsed.title || rawTitle,
      featured: Array.isArray(parsed.featured) ? parsed.featured.filter(f => f) : [],
      album: parsed.album || null,
      isRemix: !!parsed.isRemix,
      remixArtist: parsed.remixArtist || null,
      confidence: 'high',
      method: 'ai',
    };
    
    // Build full artist string with featured artists
    if (result.featured.length > 0) {
      result.fullArtist = `${result.artist} feat. ${result.featured.join(', ')}`;
    } else {
      result.fullArtist = result.artist;
    }
    
    // Cache the result
    parseCache.set(cacheKey, { data: result, timestamp: Date.now() });
    cleanCache();
    
    console.log(`[aiTitleParser] ✅ AI parsed: "${rawTitle}" -> "${result.artist} - ${result.title}"`);
    
    return result;
    
  } catch (error) {
    console.warn(`[aiTitleParser] AI parsing failed, falling back to heuristic:`, error.message);
    
    // Fall back to heuristic parser
    const heuristic = parseYouTubeTitle(rawTitle, channelName);
    return { ...heuristic, method: 'heuristic_fallback' };
  }
}

/**
 * Batch parse multiple titles with AI
 * More efficient than parsing one at a time
 * @param {Array<{ title: string, channelName?: string }>} items
 * @returns {Promise<Array>}
 */
export async function batchParseWithAI(items) {
  if (!items || items.length === 0) return [];
  
  // Check cache for all items first
  const results = new Array(items.length);
  const uncached = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cacheKey = getCacheKey(item.title, item.channelName);
    const cached = parseCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results[i] = { ...cached.data, fromCache: true };
    } else {
      uncached.push({ index: i, ...item });
    }
  }
  
  // If all cached, return immediately
  if (uncached.length === 0) {
    console.log(`[aiTitleParser] All ${items.length} titles found in cache`);
    return results;
  }
  
  console.log(`[aiTitleParser] ${items.length - uncached.length} cached, ${uncached.length} need parsing`);
  
  // Check if we have OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.log('[aiTitleParser] No OpenAI API key, using heuristic parser for batch');
    for (const item of uncached) {
      results[item.index] = { ...parseYouTubeTitle(item.title, item.channelName), method: 'heuristic' };
    }
    return results;
  }
  
  // For larger batches, use batch API call
  if (uncached.length >= 5) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Build batch prompt
      const titlesToParse = uncached.map((item, idx) => 
        `${idx + 1}. "${item.title}"${item.channelName ? ` (channel: ${item.channelName})` : ''}`
      ).join('\n');
      
      const prompt = `Extract song metadata from these YouTube titles. Return ONLY valid JSON array.

Titles:
${titlesToParse}

Return a JSON array with one object per title:
[
  {
    "index": 1,
    "artist": "artist name",
    "title": "clean song title only",
    "featured": ["featured artists"],
    "isRemix": false
  },
  ...
]

Rules:
- Remove "(Official Video)", "[Official Audio]", "(Lyrics)" etc from titles
- Extract featured artists from "feat.", "ft.", etc
- Title should be ONLY the song name
- VEVO channels usually have artist name in channel`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });
      
      const content = response.choices[0]?.message?.content;
      const parsed = JSON.parse(content);
      const parsedArray = Array.isArray(parsed) ? parsed : parsed.songs || parsed.results || [parsed];
      
      // Map results back
      for (let i = 0; i < parsedArray.length && i < uncached.length; i++) {
        const item = uncached[i];
        const aiResult = parsedArray[i];
        
        const result = {
          artist: aiResult.artist || item.channelName || 'Unknown',
          title: aiResult.title || item.title,
          featured: Array.isArray(aiResult.featured) ? aiResult.featured : [],
          isRemix: !!aiResult.isRemix,
          confidence: 'high',
          method: 'ai_batch',
        };
        
        result.fullArtist = result.featured.length > 0 
          ? `${result.artist} feat. ${result.featured.join(', ')}`
          : result.artist;
        
        results[item.index] = result;
        
        // Cache each result
        const cacheKey = getCacheKey(item.title, item.channelName);
        parseCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      
      cleanCache();
      console.log(`[aiTitleParser] ✅ AI batch parsed ${parsedArray.length} titles`);
      
    } catch (error) {
      console.warn(`[aiTitleParser] Batch AI parsing failed:`, error.message);
      // Fall back to individual heuristic parsing
      for (const item of uncached) {
        if (!results[item.index]) {
          results[item.index] = { ...parseYouTubeTitle(item.title, item.channelName), method: 'heuristic_fallback' };
        }
      }
    }
  } else {
    // For small batches, parse individually
    for (const item of uncached) {
      results[item.index] = await parseWithAI(item.title, item.channelName);
    }
  }
  
  // Fill any missing results with heuristic
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) {
      results[i] = { ...parseYouTubeTitle(items[i].title, items[i].channelName), method: 'heuristic_missing' };
    }
  }
  
  return results;
}

/**
 * Smart parse that decides whether to use AI or heuristic based on title complexity
 * @param {string} rawTitle - The raw title
 * @param {string} channelName - Channel name (optional)
 * @param {boolean} forceAI - Force AI parsing even for simple titles
 */
export async function smartParse(rawTitle, channelName = null, forceAI = false) {
  // First try heuristic
  const heuristic = parseYouTubeTitle(rawTitle, channelName);
  
  // If heuristic is confident and we're not forcing AI, use it
  if (heuristic.confidence === 'high' && !forceAI) {
    return { ...heuristic, method: 'heuristic' };
  }
  
  // For medium/low confidence or forced AI, try AI parsing
  if (process.env.OPENAI_API_KEY) {
    const aiResult = await parseWithAI(rawTitle, channelName);
    return aiResult;
  }
  
  // Fall back to heuristic
  return { ...heuristic, method: 'heuristic' };
}

export default {
  parseWithAI,
  batchParseWithAI,
  smartParse,
};

