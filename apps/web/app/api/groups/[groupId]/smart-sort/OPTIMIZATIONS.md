# Smart Sort Performance Optimizations

## Current Bottlenecks

1. **Sequential API calls** - Spotify → Last.fm → MusicBrainz (sequential)
2. **Rate limiting delays** - 200ms Last.fm, 1000ms MusicBrainz per request
3. **No caching** - Re-fetches metadata for same songs
4. **Large OpenAI prompts** - Sends all song details
5. **Synchronous processing** - Blocks API response

## Optimization Strategies

### 1. ✅ Quick Fix: Background Processing

- Return API response immediately
- Process in background
- **Speed gain**: Eliminates timeout risk, better UX

### 2. Parallel Metadata Fetching

- Run Spotify, Last.fm, MusicBrainz in parallel
- **Speed gain**: ~1.2s → ~1s per song (20% faster)

### 3. Skip Slow Sources if Fast Ones Succeed

- If Spotify + Last.fm succeed, skip MusicBrainz (saves 1s per song)
- **Speed gain**: 1s per song × N songs

### 4. Metadata Caching

- Cache metadata by (title + artist) for 24 hours
- **Speed gain**: 100% for cached songs (instant)

### 5. Reduce OpenAI Prompt Size

- Send only essential data (genres, popularity, artist)
- Skip detailed audio features if not needed
- **Speed gain**: Faster API response, lower cost

### 6. Batch Database Operations

- Use transactions for updates
- **Speed gain**: 10-20% faster DB writes

## Implementation Priority

1. **Quick fix** (background processing) - Immediate
2. **Parallel metadata** - High impact, easy
3. **Skip slow sources** - High impact, easy
4. **Caching** - Medium impact, medium effort
5. **Reduce prompt size** - Medium impact, easy
6. **Batch DB ops** - Low impact, medium effort

## Expected Speed Improvements

- **Current**: 2-5 minutes for 100 songs
- **After optimizations**: 30-90 seconds for 100 songs
- **With caching**: 10-30 seconds for cached songs
