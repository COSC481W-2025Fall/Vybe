'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from "../ui/dialog";
import { Music, Clock, User } from "lucide-react";

// Spotify Logo SVG Component
function SpotifyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

// YouTube Logo SVG Component
function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

/**
 * FriendSongCard - Expanded card showing a friend's song of the day
 * Shows larger thumbnail, user info, song details, and external links
 */
export function FriendSongCard({ song, open, onOpenChange }) {
  const router = useRouter();
  
  if (!song) return null;

  // Use cleaned title/artist if available
  const displayTitle = song.parsed_title || song.title || 'Untitled';
  const displayArtist = song.parsed_artist || song.artist || 'Unknown Artist';

  const spotifyUrl = song.spotify_url || song.spotifyUrl;
  const youtubeUrl = song.youtube_url || song.youtubeUrl;
  
  // Generate search URLs for missing platforms
  const getSpotifyLink = () => {
    if (spotifyUrl) return `${spotifyUrl}${spotifyUrl.includes('?') ? '&' : '?'}autoplay=true`;
    // Generate search URL
    const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
    return `https://open.spotify.com/search/${searchQuery}`;
  };
  
  const getYouTubeLink = () => {
    if (youtubeUrl) return `${youtubeUrl}${youtubeUrl.includes('?') ? '&' : '?'}autoplay=1`;
    // Generate search URL
    const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
    return `https://www.youtube.com/results?search_query=${searchQuery}`;
  };

  const username = song.shared_by_username;
  
  // Format the shared time
  const formatSharedTime = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 bg-transparent [&>button]:top-2 [&>button]:right-2 [&>button]:bg-black/50 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:text-white [&>button]:hover:bg-black/70 [&>button]:z-10">
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Song Artwork - Large */}
          <div className="relative aspect-square max-h-80 overflow-hidden bg-gradient-to-br from-purple-600/20 to-pink-600/20">
            {song.image_url ? (
              <img
                src={song.image_url}
                alt={song.title || 'Song artwork'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-24 w-24 text-[var(--muted-foreground)] opacity-50" />
              </div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Song info overlay - leave space for close button */}
            <div className="absolute bottom-0 left-0 right-0 p-5 pr-12">
              <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
                {displayTitle}
              </h2>
              <p className="text-lg text-white/80 drop-shadow">
                {displayArtist}
              </p>
              {song.album && (
                <p className="text-sm text-white/60 mt-1 drop-shadow">
                  {song.album}
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* User Info - Clickable to view profile */}
            <button
              onClick={() => {
                if (username) {
                  onOpenChange(false);
                  router.push(`/u/${username}`);
                }
              }}
              disabled={!username}
              className={`flex items-center gap-4 w-full text-left rounded-xl p-2 -m-2 transition-colors ${
                username 
                  ? 'hover:bg-[var(--secondary-bg)] cursor-pointer' 
                  : 'cursor-default'
              }`}
              title={username ? `View ${song.shared_by}'s profile` : undefined}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 ring-2 ring-[var(--glass-border)]">
                {song.shared_by_avatar ? (
                  <img
                    src={song.shared_by_avatar}
                    alt={song.shared_by || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                    {song.shared_by?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--foreground)] truncate flex items-center gap-2">
                  {song.shared_by || 'Anonymous'}
                  {username && <User className="h-3 w-3 text-[var(--muted-foreground)]" />}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {username ? `@${username} • Song of the day` : 'Shared this as their song of the day'}
                </p>
              </div>
            </button>

            {/* Time posted */}
            {song.shared_at && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{formatSharedTime(song.shared_at)}</span>
              </div>
            )}

            {/* Platform Buttons - Always show both */}
            <div className="flex gap-3">
              <a
                href={getSpotifyLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                  spotifyUrl 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30'
                }`}
                aria-label={spotifyUrl ? `Play ${displayTitle} on Spotify` : `Search ${displayTitle} on Spotify`}
              >
                <SpotifyIcon className="h-5 w-5" aria-hidden="true" />
                {spotifyUrl ? 'Play on Spotify' : 'Search Spotify'}
              </a>
              <a
                href={getYouTubeLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                  youtubeUrl 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30'
                }`}
                aria-label={youtubeUrl ? `Play ${displayTitle} on YouTube` : `Search ${displayTitle} on YouTube`}
              >
                <YouTubeIcon className="h-5 w-5" aria-hidden="true" />
                {youtubeUrl ? 'Play on YouTube' : 'Search YouTube'}
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

