// components/SongSearchModal.jsx
'use client';

import { Search, Music, X, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getUserProvider } from '@/lib/getUserProvider';

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
      const userProvider = await getUserProvider();
      setProvider(userProvider || 'spotify'); // Default to spotify
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
    if (!searchQuery.trim() || !provider) return;

    setLoading(true);
    setError('');

    try {
      // Use the appropriate API based on provider
      const apiEndpoint = provider === 'google'
        ? `/api/youtube-search?q=${encodeURIComponent(searchQuery)}`
        : `/api/spotify-search?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(apiEndpoint);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setSongs([]);
      } else {
        setSongs(data.tracks || data.items || []);
      }
    } catch (error) {
      setError('Failed to search songs. Please try again.');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = async (song) => {
    if (provider === 'google') {
      // YouTube/Google result
      const videoId = song.id?.videoId || song.id;
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Try to find Spotify equivalent
      const searchQuery = `${song.snippet?.title || song.title}`;
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
        name: song.snippet?.title || song.title || 'Unknown',
        artist: song.snippet?.channelTitle || 'Unknown Artist',
        album: '',
        imageUrl: song.snippet?.thumbnails?.high?.url || song.snippet?.thumbnails?.default?.url,
        previewUrl: null,
        spotifyUrl: spotifyUrl,
        youtubeUrl: youtubeUrl,
      });
    } else {
      // Spotify result
      const searchQuery = `${song.name} ${song.artists.map(a => a.name).join(' ')}`;
      let youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

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

      onSelectSong({
        id: song.id,
        name: song.name,
        artist: song.artists.map(a => a.name).join(', '),
        album: song.album.name,
        imageUrl: song.album.images[0]?.url,
        previewUrl: song.preview_url,
        spotifyUrl: song.external_urls.spotify,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="vybe-aurora glass-card rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-400/20 rounded-lg border border-purple-400/30">
              <Music className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="page-title text-xl">Search for a Song</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50"
              placeholder="Search by song name or artist..."
              autoFocus
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {songs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-white/60 mb-4">
                Found {songs.length} result{songs.length !== 1 ? 's' : ''}
              </p>
              {songs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 cursor-pointer transition-colors"
                >
                  {song.album.images[0] && (
                    <img
                      src={song.album.images[0].url}
                      alt={song.album.name}
                      className="w-12 h-12 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{song.name}</p>
                    <p className="text-sm text-white/60 truncate">
                      {song.artists.map(a => a.name).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Clock className="h-3 w-3" />
                    {formatDuration(song.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {songs.length === 0 && searchQuery && !loading && (
            <div className="text-center py-12">
              <Music className="h-16 w-16 text-white/60 mx-auto mb-4" />
              <p className="text-white/60">No songs found</p>
              <p className="text-sm text-white/40 mt-2">Try a different search term</p>
            </div>
          )}
          {songs.length === 0 && !searchQuery && !loading && (
            <div className="text-center py-12">
              <Music className="h-16 w-16 text-white/60 mx-auto mb-4" />
              <p className="text-white/60">Search for your favorite song</p>
              <p className="text-sm text-white/40 mt-2">Enter a song name or artist above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
