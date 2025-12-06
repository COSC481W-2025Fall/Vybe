// components/SongSearchModal.jsx
'use client';

import { Search, Music, X, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SongSearchModal({ onClose, onSelectSong }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState(null);
  const debounceTimerRef = useRef(null);

  // Detect which provider the user is using
  useEffect(() => {
    async function detectProvider() {
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('[SongSearchModal] No session');
          setProvider('spotify'); // Default
          return;
        }

        const identities = session.user.identities || [];
        const hasGoogle = identities.some(id => id.provider === 'google');
        const hasSpotify = identities.some(id => id.provider === 'spotify');

        console.log('[SongSearchModal] Identities:', { hasGoogle, hasSpotify });

        // Determine provider based on identities
        let detectedProvider = 'spotify'; // default

        if (hasGoogle && !hasSpotify) {
          detectedProvider = 'google';
        } else if (hasSpotify && !hasGoogle) {
          detectedProvider = 'spotify';
        } else if (hasGoogle && hasSpotify) {
          // Both linked - use most recently updated
          const sortedIdentities = [...identities].sort((a, b) => {
            return new Date(b.updated_at) - new Date(a.updated_at);
          });
          detectedProvider = sortedIdentities[0]?.provider;
        }

        console.log('[SongSearchModal] Using provider:', detectedProvider);
        setProvider(detectedProvider);
      } catch (error) {
        console.error('[SongSearchModal] Error detecting provider:', error);
        setProvider('spotify'); // Default on error
      }
    }
    detectProvider();
  }, []);

  // Search as user types with debounce
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear results
    if (!searchQuery.trim()) {
      setSongs([]);
      setError('');
      return;
    }

    // Set new timer to search after 500ms of no typing
    debounceTimerRef.current = setTimeout(() => {
      handleSearch();
    }, 500);

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Search both platforms - users can see content from both
      const [spotifyResponse, youtubeResponse] = await Promise.allSettled([
        fetch(`/api/spotify-search?q=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/youtube-search?q=${encodeURIComponent(searchQuery)}`)
      ]);

      const allSongs = [];

      // Process Spotify results
      if (spotifyResponse.status === 'fulfilled' && spotifyResponse.value.ok) {
        const spotifyData = await spotifyResponse.value.json();
        if (spotifyData.tracks && spotifyData.tracks.length > 0) {
          // Mark as Spotify and add to results
          spotifyData.tracks.forEach(track => {
            allSongs.push({
              ...track,
              _platform: 'spotify',
              _source: 'spotify'
            });
          });
        }
      }

      // Process YouTube results
      if (youtubeResponse.status === 'fulfilled' && youtubeResponse.value.ok) {
        const youtubeData = await youtubeResponse.value.json();
        if (youtubeData.items && youtubeData.items.length > 0) {
          // Convert YouTube format to match Spotify format for display
          youtubeData.items.forEach(item => {
            allSongs.push({
              id: item.id?.videoId || item.id,
              name: item.snippet?.title || 'Unknown',
              artists: [{ name: item.snippet?.channelTitle || 'Unknown Artist' }],
              album: {
                name: 'YouTube',
                images: item.snippet?.thumbnails ? [
                  { url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url }
                ] : []
              },
              duration_ms: 0, // YouTube doesn't provide duration in search
              external_urls: {
                spotify: null,
                youtube: `https://www.youtube.com/watch?v=${item.id?.videoId || item.id}`
              },
              _platform: 'youtube',
              _source: 'youtube'
            });
          });
        }
      }

      // Check for errors
      if (spotifyResponse.status === 'rejected' && youtubeResponse.status === 'rejected') {
        setError('Failed to search songs. Please try again.');
        setSongs([]);
      } else if (allSongs.length === 0) {
        setError('No songs found. Try a different search term.');
        setSongs([]);
      } else {
        setSongs(allSongs);
      }
    } catch (error) {
      console.error('[SongSearchModal] Search error:', error);
      setError('Failed to search songs. Please try again.');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = async (song) => {
    // Determine platform from song data
    const isYouTube = song._platform === 'youtube' || song._source === 'youtube' || song.id?.videoId;
    const isSpotify = song._platform === 'spotify' || song._source === 'spotify' || song.external_urls?.spotify;

    if (isYouTube) {
      // YouTube result
      const videoId = song.id?.videoId || song.id;
      const youtubeUrl = song.external_urls?.youtube || `https://www.youtube.com/watch?v=${videoId}`;

      // Try to find Spotify equivalent
      const searchQuery = `${song.snippet?.title || song.name || song.title}`;
      let spotifyUrl = null;

      try {
        const response = await fetch(`/api/spotify-search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.tracks && data.tracks.length > 0) {
            spotifyUrl = data.tracks[0].external_urls.spotify;
          }
        }
      } catch (error) {
        console.error('Failed to fetch Spotify equivalent:', error);
      }

      onSelectSong({
        id: videoId,
        name: song.snippet?.title || song.name || song.title || 'Unknown',
        artist: song.snippet?.channelTitle || song.artists?.[0]?.name || 'Unknown Artist',
        album: '',
        imageUrl: song.snippet?.thumbnails?.high?.url || song.snippet?.thumbnails?.default?.url || song.album?.images?.[0]?.url,
        previewUrl: null,
        spotifyUrl: spotifyUrl,
        youtubeUrl: youtubeUrl,
      });
    } else {
      // Spotify result (or default)
      const searchQuery = `${song.name} ${song.artists?.map(a => a.name).join(' ') || ''}`;
      let youtubeUrl = song.external_urls?.youtube || `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

      // Try to find YouTube equivalent if not already provided
      if (!song.external_urls?.youtube) {
        try {
          const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(searchQuery)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.videoUrl) {
              youtubeUrl = data.videoUrl;
            }
          }
        } catch (error) {
          console.error('Failed to fetch YouTube video:', error);
        }
      }

      onSelectSong({
        id: song.id,
        name: song.name,
        artist: song.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
        album: song.album?.name || '',
        imageUrl: song.album?.images?.[0]?.url,
        previewUrl: song.preview_url,
        spotifyUrl: song.external_urls?.spotify,
        youtubeUrl: youtubeUrl,
      });
    }

    onClose();
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-search-title"
    >
      <div className="glass-card rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-400/20 rounded-lg border border-purple-400/30">
              <Music className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" aria-hidden="true" />
            </div>
            <h2 id="song-search-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">Search for a Song</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[var(--input-bg)] border-2 border-[var(--glass-border)] rounded-lg text-[var(--foreground)] text-base sm:text-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400"
              placeholder="Search by song name or artist..."
              autoFocus
              aria-label="Search for songs"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                <span className="sr-only">Searching...</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mb-3 sm:mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex-shrink-0" role="alert">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 modal-scroll min-h-0" role="list" aria-label="Search results">
          {songs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted-foreground)] mb-3 sm:mb-4" aria-live="polite">
                Found {songs.length} result{songs.length !== 1 ? 's' : ''}
              </p>
              {songs.map((song, index) => {
                const isYouTube = song._platform === 'youtube' || song._source === 'youtube';
                const imageUrl = song.album?.images?.[0]?.url || song.snippet?.thumbnails?.high?.url || song.snippet?.thumbnails?.default?.url;
                const songName = song.name || song.snippet?.title || 'Unknown';
                const artistName = song.artists?.map(a => a.name).join(', ') || song.snippet?.channelTitle || 'Unknown Artist';
                const duration = song.duration_ms || 0;

                return (
                  <button
                    key={`${song.id || song.id?.videoId || index}-${song._platform || song._source || 'unknown'}`}
                    onClick={() => handleSelectSong(song)}
                    className="w-full flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-3 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] rounded-lg border border-[var(--glass-border)] cursor-pointer transition-colors text-left"
                    role="listitem"
                    aria-label={`${songName} by ${artistName}${isYouTube ? ', from YouTube' : ', from Spotify'}`}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="text-[var(--foreground)] font-medium text-sm sm:text-base truncate">{songName}</p>
                        {isYouTube && (
                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium bg-red-600 text-white border border-red-500 flex-shrink-0">
                            YT
                          </span>
                        )}
                        {song._platform === 'spotify' && (
                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium bg-green-600 text-white border border-green-500 flex-shrink-0">
                            Spotify
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--muted-foreground)] truncate">
                        {artistName}
                      </p>
                    </div>
                    {duration > 0 && (
                      <div className="hidden sm:flex items-center gap-2 text-[var(--muted-foreground)] text-sm flex-shrink-0">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <span aria-label={`Duration: ${formatDuration(duration)}`}>{formatDuration(duration)}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {songs.length === 0 && searchQuery && !loading && (
            <div className="text-center py-8 sm:py-12">
              <Music className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" aria-hidden="true" />
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">No songs found</p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] opacity-70 mt-2">Try a different search term</p>
            </div>
          )}
          {songs.length === 0 && !searchQuery && !loading && (
            <div className="text-center py-8 sm:py-12">
              <Music className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" aria-hidden="true" />
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Search for your favorite song</p>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] opacity-70 mt-2">Enter a song name or artist above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
