/**
 * Smart Sort Engine - Scalable, Production-Ready Music Sorting
 * 
 * Architecture:
 * 1. LOCAL HEURISTIC SORTING (fast, handles 99% of work)
 * 2. OPTIONAL AI VERIFICATION (quality improvement)
 * 3. CASCADING FALLBACKS (gpt-4o-mini → gpt-3.5-turbo → heuristic)
 * 4. REQUEST QUEUING (handles concurrent load)
 */

import OpenAI from 'openai';
import { alertSortSystemStress, alertOpenAIIssue } from '../monitoring/alerting';

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  // AI Settings
  AI_TIMEOUT_MS: 10000,          // 10 seconds max for AI call (faster timeout)
  AI_FALLBACK_TIMEOUT_MS: 6000,  // 6 seconds for fallback model
  PRIMARY_MODEL: 'gpt-4o-mini',
  FALLBACK_MODEL: 'gpt-3.5-turbo',
  
  // Queue Settings - Maximized for hardware limits
  // Vercel serverless: ~10 concurrent connections recommended
  // OpenAI API: Tier 1 = 60 RPM, Tier 2+ = 500+ RPM
  // We batch requests, so actual concurrency can be higher
  MAX_CONCURRENT_AI_REQUESTS: 16, // Maximized for high throughput
  QUEUE_TIMEOUT_MS: 30000,       // 30 seconds - faster failure for better UX
  MAX_QUEUE_SIZE: 200,           // Support 200 queued requests
  ESTIMATED_TIME_PER_REQUEST: 3500, // 3.5 seconds average (optimized prompts)
  
  // Batch Processing - Process multiple sorts in parallel
  BATCH_SIZE: 4,                 // Process 4 sorts simultaneously per batch
  BATCH_DELAY_MS: 100,           // 100ms delay between batches
  
  // Sorting Settings
  TOP_POPULARITY_PERCENT: 0.20,  // Top 20% are "popular"
  MAX_CONSECUTIVE_SAME_ARTIST: 1,
  MAX_CONSECUTIVE_SAME_GENRE: 1,
  
  // Stress handling - optimized for production scale
  STRESS_THRESHOLD_MS: 8000,     // 8s avg before stress mode
  HEALTH_CHECK_INTERVAL: 15000,  // Check system health every 15s
  STRESS_RECOVERY_MS: 30000,     // 30s cooldown after stress
  
  // Performance tuning
  USE_STREAMING: false,          // Streaming not needed for small responses
  CACHE_METADATA_MS: 300000,     // Cache song metadata for 5 minutes
};

// ═══════════════════════════════════════════════════════════
// REQUEST QUEUE - Handles concurrent load
// ═══════════════════════════════════════════════════════════

class RequestQueue {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
    this.responseTimes = [];      // Track recent response times
    this.isUnderStress = false;   // Stress mode flag
    this.totalProcessed = 0;
    this.totalFailed = 0;
  }

  /**
   * Get estimated wait time based on queue position
   */
  getEstimatedWaitTime() {
    if (this.queue.length === 0 && this.running < this.maxConcurrent) {
      return 0;
    }
    
    const avgTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : CONFIG.ESTIMATED_TIME_PER_REQUEST;
    
    // Calculate based on queue position and concurrent capacity
    const effectiveQueueLength = Math.max(0, this.queue.length - this.maxConcurrent + this.running);
    const batchesAhead = Math.ceil(effectiveQueueLength / this.maxConcurrent);
    
    return Math.round(batchesAhead * avgTime);
  }

  /**
   * Get queue position for a new request
   */
  getQueuePosition() {
    return this.queue.length + 1;
  }

  async enqueue(task, options = {}) {
    const { skipQueue = false } = options;
    
    // If user wants to skip queue, throw immediately so they get heuristic
    if (skipQueue && (this.queue.length > 0 || this.running >= this.maxConcurrent)) {
      console.log('[Queue] User chose to skip queue');
      throw new Error('User skipped queue - using heuristic');
    }

    // Only reject if truly at capacity (100 items) - give demos room
    if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
      console.log(`[Queue] Queue at max capacity (${this.queue.length})`);
      throw new Error('Queue at capacity - please try again shortly');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const queuePosition = this.queue.length + 1;
      
      const timeoutId = setTimeout(() => {
        // Remove from queue if still waiting
        const idx = this.queue.findIndex(q => q.resolve === resolve);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.totalFailed++;
          reject(new Error('Queue timeout - falling back to heuristic'));
        }
      }, CONFIG.QUEUE_TIMEOUT_MS);

      const execute = async () => {
        clearTimeout(timeoutId);
        this.running++;
        const taskStartTime = Date.now();
        const waitTime = taskStartTime - startTime;
        
        console.log(`[Queue] Executing after ${waitTime}ms wait`);
        
        try {
          const result = await task();
          
          // Track response time
          const responseTime = Date.now() - taskStartTime;
          this.trackResponseTime(responseTime);
          this.totalProcessed++;
          
          resolve({ ...result, queueWaitTime: waitTime });
        } catch (error) {
          this.totalFailed++;
          reject(error);
        } finally {
          this.running--;
          this.processNext();
        }
      };

      if (this.running < this.maxConcurrent) {
        execute();
      } else {
        this.queue.push({ execute, resolve, reject, enqueuedAt: startTime, position: queuePosition });
        console.log(`[Queue] Request queued. Position: ${queuePosition}/${CONFIG.MAX_QUEUE_SIZE}, Running: ${this.running}/${this.maxConcurrent}`);
      }
    });
  }

  processNext() {
    // Process multiple items at once if capacity allows (batch processing)
    const availableSlots = this.maxConcurrent - this.running;
    const itemsToProcess = Math.min(availableSlots, this.queue.length, CONFIG.BATCH_SIZE || 4);
    
    for (let i = 0; i < itemsToProcess; i++) {
      if (this.queue.length > 0 && this.running < this.maxConcurrent) {
        const next = this.queue.shift();
        // Stagger execution slightly to avoid thundering herd
        if (i > 0 && CONFIG.BATCH_DELAY_MS) {
          setTimeout(() => next.execute(), CONFIG.BATCH_DELAY_MS * i);
        } else {
          next.execute();
        }
      }
    }
  }

  trackResponseTime(time) {
    this.responseTimes.push(time);
    // Keep only last 20 response times for better averaging
    if (this.responseTimes.length > 20) {
      this.responseTimes.shift();
    }
    
    // Check for stress condition
    const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    if (avgResponseTime > CONFIG.STRESS_THRESHOLD_MS && !this.isUnderStress) {
      console.log(`[Queue] Entering stress mode. Avg response: ${avgResponseTime}ms`);
      this.isUnderStress = true;
      
      // Send alert to team
      alertSortSystemStress(this.getStatus()).catch(err => 
        console.error('[Queue] Failed to send stress alert:', err)
      );
      
      // Auto-recover after configured time
      setTimeout(() => {
        console.log('[Queue] Exiting stress mode');
        this.isUnderStress = false;
      }, CONFIG.STRESS_RECOVERY_MS);
    }
  }

  getStatus() {
    const avgResponseTime = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : CONFIG.ESTIMATED_TIME_PER_REQUEST;

    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: CONFIG.MAX_QUEUE_SIZE,
      isUnderStress: this.isUnderStress,
      avgResponseTimeMs: avgResponseTime,
      estimatedWaitTimeMs: this.getEstimatedWaitTime(),
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      healthScore: this.calculateHealthScore(),
      canAcceptMore: this.queue.length < CONFIG.MAX_QUEUE_SIZE,
    };
  }

  calculateHealthScore() {
    // 0-100 score based on queue status and response times
    let score = 100;
    
    // Deduct for queue usage (less penalty since we support more)
    score -= (this.queue.length / CONFIG.MAX_QUEUE_SIZE) * 20;
    
    // Deduct for concurrent usage
    score -= (this.running / this.maxConcurrent) * 15;
    
    // Deduct for slow responses
    const avgTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;
    score -= Math.min(25, (avgTime / CONFIG.STRESS_THRESHOLD_MS) * 25);
    
    // Deduct for stress mode
    if (this.isUnderStress) score -= 15;
    
    return Math.max(0, Math.round(score));
  }

  // Force clear queue (emergency)
  clearQueue() {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item.reject(new Error('Queue cleared'));
    }
    console.log('[Queue] Queue cleared');
  }
}

// Global queue instance
const aiRequestQueue = new RequestQueue(CONFIG.MAX_CONCURRENT_AI_REQUESTS);

// ═══════════════════════════════════════════════════════════
// GENRE MAPPING - Maps raw tags to standard genres
// ═══════════════════════════════════════════════════════════

const GENRE_MAPPINGS = {
  // Pop
  'pop': 'Pop', 'dance-pop': 'Pop', 'synth-pop': 'Pop', 'indie-pop': 'Pop',
  'electropop': 'Pop', 'art pop': 'Pop', 'dream pop': 'Pop', 'k-pop': 'Pop',
  
  // Hip-Hop/Rap
  'hip-hop': 'Hip-Hop/Rap', 'hip hop': 'Hip-Hop/Rap', 'rap': 'Hip-Hop/Rap',
  'trap': 'Hip-Hop/Rap', 'drill': 'Hip-Hop/Rap', 'atlanta bass': 'Hip-Hop/Rap',
  'gangsta rap': 'Hip-Hop/Rap', 'conscious hip hop': 'Hip-Hop/Rap',
  
  // Rock
  'rock': 'Rock', 'alternative rock': 'Rock', 'indie rock': 'Rock',
  'punk': 'Rock', 'metal': 'Rock', 'hard rock': 'Rock', 'grunge': 'Rock',
  
  // Electronic/Dance
  'electronic': 'Electronic', 'edm': 'Electronic', 'house': 'Electronic',
  'techno': 'Electronic', 'trance': 'Electronic', 'dubstep': 'Electronic',
  'drum and bass': 'Electronic', 'dnb': 'Electronic',
  
  // R&B/Soul
  'r&b': 'R&B/Soul', 'rnb': 'R&B/Soul', 'soul': 'R&B/Soul', 'neo-soul': 'R&B/Soul',
  'funk': 'R&B/Soul', 'motown': 'R&B/Soul',
  
  // Latin
  'latin': 'Latin', 'reggaeton': 'Latin', 'latin pop': 'Latin',
  'salsa': 'Latin', 'bachata': 'Latin', 'cumbia': 'Latin',
  
  // Country
  'country': 'Country', 'country pop': 'Country', 'bluegrass': 'Country',
  'americana': 'Country',
  
  // Jazz/Blues
  'jazz': 'Jazz/Blues', 'blues': 'Jazz/Blues', 'smooth jazz': 'Jazz/Blues',
  'bebop': 'Jazz/Blues',
  
  // Classical
  'classical': 'Classical', 'instrumental': 'Classical', 'orchestral': 'Classical',
  'piano': 'Classical', 'ambient': 'Classical',
};

function mapToStandardGenre(genres) {
  if (!genres || genres.length === 0) return 'Other';
  
  for (const genre of genres) {
    const normalized = genre.toLowerCase().trim();
    if (GENRE_MAPPINGS[normalized]) {
      return GENRE_MAPPINGS[normalized];
    }
    // Partial match
    for (const [key, value] of Object.entries(GENRE_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
  }
  return 'Other';
}

// ═══════════════════════════════════════════════════════════
// LOCAL HEURISTIC SORTING - Fast, scalable, no AI needed
// ═══════════════════════════════════════════════════════════

/**
 * Sort songs using local heuristics - no AI, instant results
 * This handles 100% of the work and is production-ready on its own
 */
export function heuristicSort(songs) {
  console.log(`[Heuristic] Starting local sort of ${songs.length} songs`);
  const startTime = Date.now();

  if (!songs || songs.length === 0) return [];
  if (songs.length === 1) return [songs[0].songId];

  // Step 1: Enrich songs with standard genre
  const enrichedSongs = songs.map(song => ({
    ...song,
    standardGenre: mapToStandardGenre(song.genres),
  }));

  // Step 2: Calculate popularity threshold (top 20%)
  const sortedByPopularity = [...enrichedSongs].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const top20Index = Math.max(1, Math.floor(sortedByPopularity.length * CONFIG.TOP_POPULARITY_PERCENT));
  const popularityThreshold = sortedByPopularity[top20Index - 1]?.popularity || 0;

  // Step 3: Separate into popular and regular songs
  const popularSongs = enrichedSongs.filter(s => (s.popularity || 0) >= popularityThreshold);
  const regularSongs = enrichedSongs.filter(s => (s.popularity || 0) < popularityThreshold);

  // Sort popular by popularity (highest first)
  popularSongs.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  
  // Shuffle regular songs for variety
  shuffleArray(regularSongs);

  console.log(`[Heuristic] Popular: ${popularSongs.length}, Regular: ${regularSongs.length}`);

  // Step 4: Interleave to avoid consecutive same artist/genre
  const result = [];
  const lastArtists = []; // Track last N artists
  const lastGenres = [];  // Track last N genres
  
  // Process popular songs first (with interleaving)
  const interleavedPopular = interleaveByConstraints(popularSongs, lastArtists, lastGenres);
  result.push(...interleavedPopular);

  // Process regular songs (spread throughout, with interleaving)
  const interleavedRegular = interleaveByConstraints(regularSongs, lastArtists, lastGenres);
  
  // Merge regular songs into result, spreading them out
  if (interleavedRegular.length > 0 && result.length > 0) {
    // Insert regular songs at intervals
    const merged = spreadSongsEvenly(result, interleavedRegular);
    result.length = 0;
    result.push(...merged);
  } else {
    result.push(...interleavedRegular);
  }

  const sortTime = Date.now() - startTime;
  console.log(`[Heuristic] ✅ Sorted ${result.length} songs in ${sortTime}ms`);

  // Validate quality
  const quality = validateSortQuality(result, enrichedSongs);
  console.log(`[Heuristic] Quality: ${quality.artistViolations} artist violations, ${quality.genreViolations} genre violations`);

  return result.map(s => s.songId);
}

/**
 * Interleave songs to avoid consecutive same artist/genre
 */
function interleaveByConstraints(songs, lastArtists, lastGenres) {
  if (songs.length === 0) return [];
  
  const result = [];
  const remaining = [...songs];
  
  while (remaining.length > 0) {
    // Find best candidate that doesn't violate constraints
    let bestIdx = -1;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const song = remaining[i];
      const score = calculatePlacementScore(song, lastArtists, lastGenres);
      
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    
    // If no good candidate, just take the first one
    if (bestIdx === -1) bestIdx = 0;
    
    const chosen = remaining.splice(bestIdx, 1)[0];
    result.push(chosen);
    
    // Update tracking
    lastArtists.unshift(chosen.artist);
    lastGenres.unshift(chosen.standardGenre);
    if (lastArtists.length > 3) lastArtists.pop();
    if (lastGenres.length > 3) lastGenres.pop();
  }
  
  return result;
}

/**
 * Calculate score for placing a song at current position
 * Higher score = better placement
 */
function calculatePlacementScore(song, lastArtists, lastGenres) {
  let score = 0;
  
  const artist = song.artist || 'Unknown';
  const genre = song.standardGenre || 'Other';
  
  // Penalize consecutive same artist (heavy penalty)
  if (lastArtists.length > 0 && lastArtists[0] === artist) {
    score -= 1000;
  } else if (lastArtists.length > 1 && lastArtists[1] === artist) {
    score -= 100;
  }
  
  // Penalize consecutive same genre
  if (lastGenres.length > 0 && lastGenres[0] === genre) {
    score -= 500;
  } else if (lastGenres.length > 1 && lastGenres[1] === genre) {
    score -= 50;
  }
  
  // Bonus for variety
  if (!lastArtists.includes(artist)) score += 10;
  if (!lastGenres.includes(genre)) score += 5;
  
  // Small bonus for popularity (tie-breaker)
  score += (song.popularity || 0) / 100;
  
  return score;
}

/**
 * Spread songs B evenly into songs A
 */
function spreadSongsEvenly(songsA, songsB) {
  if (songsB.length === 0) return songsA;
  if (songsA.length === 0) return songsB;
  
  const result = [];
  const interval = Math.max(2, Math.floor(songsA.length / songsB.length));
  let bIndex = 0;
  
  for (let i = 0; i < songsA.length; i++) {
    result.push(songsA[i]);
    
    // Insert from B at intervals
    if ((i + 1) % interval === 0 && bIndex < songsB.length) {
      result.push(songsB[bIndex++]);
    }
  }
  
  // Add remaining B songs
  while (bIndex < songsB.length) {
    result.push(songsB[bIndex++]);
  }
  
  return result;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Validate sort quality
 */
function validateSortQuality(sortedSongs, songDataMap) {
  let artistViolations = 0;
  let genreViolations = 0;
  let lastArtist = null;
  let lastGenre = null;
  
  const idToSong = new Map();
  songDataMap.forEach(s => idToSong.set(s.songId, s));
  
  for (const song of sortedSongs) {
    const data = typeof song === 'string' ? idToSong.get(song) : song;
    if (!data) continue;
    
    const artist = data.artist || 'Unknown';
    const genre = data.standardGenre || 'Other';
    
    if (artist === lastArtist) artistViolations++;
    if (genre === lastGenre) genreViolations++;
    
    lastArtist = artist;
    lastGenre = genre;
  }
  
  return { artistViolations, genreViolations };
}

// ═══════════════════════════════════════════════════════════
// AI VERIFICATION - Optional quality improvement
// ═══════════════════════════════════════════════════════════

let openaiClient = null;

function getOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Use AI to verify and potentially improve the heuristic sort
 * Only checks for issues, doesn't re-sort everything
 */
async function aiVerifySort(songs, heuristicOrder, model, timeoutMs) {
  const openai = getOpenAI();
  if (!openai) {
    console.log('[AI] No OpenAI API key, skipping verification');
    return null;
  }

  // Create a sample for verification (first 50 + random 20)
  const sampleSize = Math.min(70, heuristicOrder.length);
  const sample = heuristicOrder.slice(0, Math.min(50, heuristicOrder.length));
  
  // Add some random samples from the rest
  if (heuristicOrder.length > 50) {
    const rest = heuristicOrder.slice(50);
    for (let i = 0; i < Math.min(20, rest.length); i++) {
      const idx = Math.floor(Math.random() * rest.length);
      sample.push(rest[idx]);
    }
  }

  const songMap = new Map(songs.map(s => [s.songId, s]));
  const sampleData = sample.map((id, idx) => {
    const song = songMap.get(id);
    return {
      position: idx + 1,
      songId: id,
      title: song?.title || 'Unknown',
      artist: song?.artist || 'Unknown',
      genre: mapToStandardGenre(song?.genres),
      popularity: song?.popularity || 0,
    };
  });

  const prompt = `Review this song order for a playlist. Check for issues:
1. Consecutive same artist (BAD)
2. Consecutive same genre (BAD)
3. Popular songs not near the top (BAD)

Current order (sample of ${sampleData.length} songs):
${JSON.stringify(sampleData.slice(0, 30), null, 2)}

Respond with JSON:
{
  "isGood": true/false,
  "issues": ["issue 1", "issue 2"],
  "suggestedSwaps": [{"from": position, "to": position}] // max 5 swaps
}

Only suggest swaps if there are CLEAR violations. If the order looks good, return isGood: true with empty arrays.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a music playlist quality checker. Be concise. Only flag clear violations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }, { signal: controller.signal });

    clearTimeout(timeoutId);

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[AI] ${model} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`[AI] ${model} error:`, error.message);
      // Alert on non-timeout errors (potential API issues)
      if (error.message?.includes('quota') || error.message?.includes('rate') || error.message?.includes('billing')) {
        alertOpenAIIssue(error).catch(err => 
          console.error('[AI] Failed to send OpenAI alert:', err)
        );
      }
    }
    return null;
  }
}

/**
 * Apply suggested swaps from AI verification
 */
function applySwaps(order, swaps) {
  if (!swaps || swaps.length === 0) return order;
  
  const result = [...order];
  for (const swap of swaps.slice(0, 5)) { // Max 5 swaps
    const from = swap.from - 1; // Convert to 0-indexed
    const to = swap.to - 1;
    
    if (from >= 0 && from < result.length && to >= 0 && to < result.length) {
      [result[from], result[to]] = [result[to], result[from]];
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// MAIN ENTRY POINT - Orchestrates everything
// ═══════════════════════════════════════════════════════════

/**
 * Smart sort with local heuristics, AI verification, and fallbacks
 * 
 * Flow:
 * 1. LOCAL HEURISTIC SORT (instant, always runs)
 * 2. AI VERIFICATION via queue (optional, timeout-protected)
 *    - Try gpt-4o-mini (12s timeout)
 *    - Fallback to gpt-3.5-turbo (8s timeout)
 *    - Fallback to heuristic result
 * 3. RETURN RESULT
 */
export async function smartSort(allSongsMetadata, options = {}) {
  const startTime = Date.now();
  const skipAI = options.skipAI || false;
  const skipQueue = options.skipQueue || false; // User can skip queue for instant heuristic
  
  console.log('\n========== [SMART SORT ENGINE] Starting ==========');
  console.log(`[Engine] Processing ${allSongsMetadata.length} songs`);
  console.log(`[Engine] Options: skipAI=${skipAI}, skipQueue=${skipQueue}`);
  console.log(`[Engine] Queue status:`, aiRequestQueue.getStatus());

  // Validate input
  if (!allSongsMetadata || allSongsMetadata.length === 0) {
    return {
      sortedSongIds: [],
      summary: { totalSongs: 0, method: 'empty', duration: 0 }
    };
  }

  // STEP 1: Local heuristic sort (always runs, instant)
  console.log('[Engine] Step 1: Running local heuristic sort...');
  const heuristicStart = Date.now();
  let sortedIds = heuristicSort(allSongsMetadata);
  const heuristicTime = Date.now() - heuristicStart;
  console.log(`[Engine] Heuristic sort completed in ${heuristicTime}ms`);

  let method = 'heuristic';
  let aiModel = null;
  let aiTime = null;

  // STEP 2: AI verification (optional, queued, timeout-protected)
  if (!skipAI && process.env.OPENAI_API_KEY && allSongsMetadata.length >= 5) {
    console.log('[Engine] Step 2: Queueing AI verification...');
    
    try {
      const aiResult = await aiRequestQueue.enqueue(async () => {
        const aiStart = Date.now();
        
        // Try primary model first
        console.log(`[Engine] Trying ${CONFIG.PRIMARY_MODEL}...`);
        let verification = await aiVerifySort(
          allSongsMetadata, 
          sortedIds, 
          CONFIG.PRIMARY_MODEL, 
          CONFIG.AI_TIMEOUT_MS
        );
        
        // Fallback to secondary model if primary failed/timed out
        if (!verification) {
          console.log(`[Engine] Falling back to ${CONFIG.FALLBACK_MODEL}...`);
          verification = await aiVerifySort(
            allSongsMetadata,
            sortedIds,
            CONFIG.FALLBACK_MODEL,
            CONFIG.AI_FALLBACK_TIMEOUT_MS
          );
        }
        
        return {
          verification,
          duration: Date.now() - aiStart,
          model: verification ? (verification.model || CONFIG.PRIMARY_MODEL) : null
        };
      }, { skipQueue }); // Pass skipQueue option - if true, uses heuristic immediately when queue has items

      if (aiResult.verification) {
        aiTime = aiResult.duration;
        aiModel = aiResult.model;
        
        if (aiResult.verification.isGood) {
          console.log('[Engine] AI verified: sort looks good');
          method = 'heuristic+ai-verified';
        } else if (aiResult.verification.suggestedSwaps?.length > 0) {
          console.log(`[Engine] AI suggested ${aiResult.verification.suggestedSwaps.length} swaps`);
          sortedIds = applySwaps(sortedIds, aiResult.verification.suggestedSwaps);
          method = 'heuristic+ai-improved';
        } else {
          method = 'heuristic+ai-checked';
        }
        
        console.log(`[Engine] AI verification completed in ${aiTime}ms`);
      } else {
        console.log('[Engine] AI verification failed, using heuristic result');
        method = 'heuristic-only';
      }
    } catch (error) {
      console.warn('[Engine] AI verification error:', error.message);
      method = 'heuristic-fallback';
    }
  } else {
    console.log('[Engine] Skipping AI verification');
    method = skipAI ? 'heuristic-forced' : 'heuristic-only';
  }

  // Build summary
  const totalTime = Date.now() - startTime;
  const songMap = new Map(allSongsMetadata.map(s => [s.songId, s]));
  
  // Calculate genre distribution
  const genreDistribution = {};
  const artistDistribution = {};
  sortedIds.forEach(id => {
    const song = songMap.get(id);
    if (song) {
      const genre = mapToStandardGenre(song.genres);
      const artist = song.artist || 'Unknown';
      genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
      artistDistribution[artist] = (artistDistribution[artist] || 0) + 1;
    }
  });

  // Validate final quality
  const enrichedSongs = allSongsMetadata.map(s => ({
    ...s,
    standardGenre: mapToStandardGenre(s.genres)
  }));
  const quality = validateSortQuality(sortedIds, enrichedSongs);

  console.log(`[Engine] ✅ Complete in ${totalTime}ms (heuristic: ${heuristicTime}ms, AI: ${aiTime || 'skipped'}ms)`);
  console.log(`[Engine] Method: ${method}`);
  console.log(`[Engine] Quality: ${quality.artistViolations} artist violations, ${quality.genreViolations} genre violations`);
  console.log('========== [SMART SORT ENGINE] Done ==========\n');

  return {
    sortedSongIds: sortedIds,
    summary: {
      totalSongs: sortedIds.length,
      method,
      duration: totalTime,
      heuristicTime,
      aiTime,
      aiModel,
      genreDistribution,
      artistDistribution,
      quality,
    }
  };
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return aiRequestQueue.getStatus();
}

/**
 * Get estimated wait time for a new request
 */
export function getEstimatedWaitTime() {
  return aiRequestQueue.getEstimatedWaitTime();
}

/**
 * Get current queue position for display
 */
export function getQueuePosition() {
  return aiRequestQueue.getQueuePosition();
}

/**
 * Force heuristic-only sort (no AI)
 */
export function heuristicOnlySort(allSongsMetadata) {
  return smartSort(allSongsMetadata, { skipAI: true });
}

/**
 * Check if system is healthy enough for AI sorting
 */
export function isSystemHealthy() {
  const status = aiRequestQueue.getStatus();
  return status.healthScore >= 50 && !status.isUnderStress;
}

/**
 * Get system health report
 */
export function getSystemHealth() {
  const queueStatus = aiRequestQueue.getStatus();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  return {
    overall: queueStatus.healthScore >= 70 ? 'healthy' : 
             queueStatus.healthScore >= 40 ? 'degraded' : 'unhealthy',
    score: queueStatus.healthScore,
    queue: queueStatus,
    capabilities: {
      ai: hasOpenAI && !queueStatus.isUnderStress,
      heuristic: true, // Always available
      realtime: true,
    },
    recommendations: getRecommendations(queueStatus),
  };
}

/**
 * Get recommendations based on system state
 */
function getRecommendations(status) {
  const recommendations = [];
  
  if (status.isUnderStress) {
    recommendations.push('System under stress - using fast local sorting');
  }
  if (status.queued > 10) {
    recommendations.push('High demand - consider retrying later for AI-enhanced results');
  }
  if (status.avgResponseTimeMs > 8000) {
    recommendations.push('Slow AI responses - local sorting recommended');
  }
  if (!process.env.OPENAI_API_KEY) {
    recommendations.push('AI features unavailable - using local sorting');
  }
  
  return recommendations;
}

/**
 * Emergency: Clear queue and reset state
 */
export function emergencyReset() {
  aiRequestQueue.clearQueue();
  aiRequestQueue.isUnderStress = false;
  aiRequestQueue.responseTimes = [];
  console.log('[SmartSort] Emergency reset completed');
  return { success: true, message: 'System reset' };
}

