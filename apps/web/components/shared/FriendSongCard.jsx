'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from "../ui/dialog";
import { Music, Clock, User, ExternalLink, Play } from "lucide-react";
import { useMiniplayer } from '@/lib/context/GlobalStateContext';

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
  const { playSong } = useMiniplayer();
  
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

  // Handle playing in miniplayer
  const handlePlayInMiniplayer = () => {
    // Determine platform and external_id from URLs or data
    let platform = null;
    let external_id = null;

    if (spotifyUrl) {
      // Extract Spotify track ID from URL
      const spotifyMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
      if (spotifyMatch) {
        platform = 'spotify';
        external_id = spotifyMatch[1];
      }
    }
    
    if (!platform && youtubeUrl) {
      // Extract YouTube video ID from URL
      const ytMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) {
        platform = 'youtube';
        external_id = ytMatch[1];
      }
    }

    if (platform && external_id) {
      playSong({
        id: song.id || `${platform}-${external_id}`,
        external_id,
        platform,
        title: displayTitle,
        parsed_title: displayTitle,
        artist: displayArtist,
        parsed_artist: displayArtist,
        thumbnail_url: song.image_url,
      });
    }
  };

  const canPlayInMiniplayer = !!(spotifyUrl || youtubeUrl);

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
      <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full p-0 overflow-hidden border-0 bg-transparent [&>button]:hidden">
        <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Header Section - Centered Album Art */}
          <div className="relative pt-5 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-6 bg-gradient-to-b from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent">
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors flex items-center justify-center text-white/80 hover:text-white z-10"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Centered Album Art - Clickable to play */}
            <div className="flex justify-center">
              <div className="relative">
                <button
                  onClick={canPlayInMiniplayer ? handlePlayInMiniplayer : undefined}
                  disabled={!canPlayInMiniplayer}
                  className={`group w-32 h-32 sm:w-48 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl ring-2 sm:ring-4 ring-white/10 bg-gradient-to-br from-purple-600/30 to-pink-600/30 relative ${canPlayInMiniplayer ? 'cursor-pointer' : ''}`}
                >
                  {song.image_url ? (
                    <img
                      src={song.image_url}
                      alt={song.title || 'Song artwork'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-12 sm:h-16 w-12 sm:w-16 text-[var(--muted-foreground)] opacity-50" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  {canPlayInMiniplayer && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-6 w-6 sm:h-8 sm:w-8 text-black ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </button>
                
                {/* Decorative glow - hidden on mobile for performance */}
                <div className="hidden sm:block absolute -inset-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl -z-10" />
              </div>
            </div>
          </div>

          {/* Song Info - Centered */}
          <div className="px-4 sm:px-6 pb-3 sm:pb-4 text-center">
            <h2 className="text-lg sm:text-2xl font-bold text-[var(--foreground)] leading-tight line-clamp-2">
              {displayTitle}
            </h2>
            <p className="text-sm sm:text-lg text-[var(--muted-foreground)] mt-0.5 sm:mt-1 line-clamp-1">
              {displayArtist}
            </p>
            {song.album && (
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]/70 mt-0.5 line-clamp-1 hidden sm:block">
                {song.album}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 sm:mx-6 h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />

          {/* User Info & Time */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {/* User Card */}
            <button
              onClick={() => {
                if (username) {
                  onOpenChange(false);
                  router.push(`/u/${username}`);
                }
              }}
              disabled={!username}
              className={`flex items-center gap-3 sm:gap-4 w-full text-left rounded-xl sm:rounded-2xl p-2 sm:p-3 transition-all ${
                username 
                  ? 'hover:bg-[var(--secondary-bg)] cursor-pointer active:scale-[0.98]' 
                  : 'cursor-default'
              }`}
              title={username ? `View ${song.shared_by}'s profile` : undefined}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 ring-2 ring-[var(--glass-border)] shadow-md">
                {song.shared_by_avatar ? (
                  <img
                    src={song.shared_by_avatar}
                    alt={song.shared_by || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                    {song.shared_by?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-[var(--foreground)] truncate flex items-center gap-2">
                  {song.shared_by || 'Anonymous'}
                  {username && (
                    <span className="text-xs text-[var(--accent)] font-normal items-center gap-1 hidden sm:flex">
                      <ExternalLink className="h-3 w-3" />
                      View Profile
                    </span>
                  )}
                </p>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
                  {username ? `@${username}` : 'Shared this song'}
                </p>
              </div>
              {/* Mobile-only arrow indicator */}
              {username && (
                <ExternalLink className="h-4 w-4 text-[var(--muted-foreground)] sm:hidden flex-shrink-0" />
              )}
            </button>

            {/* Time Badge */}
            {song.shared_at && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[var(--muted-foreground)] bg-[var(--secondary-bg)] rounded-full py-1.5 sm:py-2 px-3 sm:px-4 w-fit mx-auto">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span>Shared {formatSharedTime(song.shared_at)}</span>
              </div>
            )}

            {/* Platform Buttons - Icon-only for sleek design */}
            <div className="flex justify-center gap-4 pt-1 sm:pt-2">
              <a
                href={getSpotifyLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl transition-all active:scale-95 ${
                  spotifyUrl 
                    ? 'bg-[#1DB954] hover:bg-[#1ed760] text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40' 
                    : 'bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] border border-[#1DB954]/30 hover:border-[#1DB954]/50'
                }`}
                aria-label={spotifyUrl ? `Play ${displayTitle} on Spotify` : `Search ${displayTitle} on Spotify`}
                title={spotifyUrl ? 'Play on Spotify' : 'Search on Spotify'}
              >
                <SpotifyIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                {!spotifyUrl && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                )}
              </a>
              <a
                href={getYouTubeLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl transition-all active:scale-95 ${
                  youtubeUrl 
                    ? 'bg-[#FF0000] hover:bg-[#ff1a1a] text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40' 
                    : 'bg-[#FF0000]/15 hover:bg-[#FF0000]/25 text-[#FF0000] border border-[#FF0000]/30 hover:border-[#FF0000]/50'
                }`}
                aria-label={youtubeUrl ? `Play ${displayTitle} on YouTube` : `Search ${displayTitle} on YouTube`}
                title={youtubeUrl ? 'Play on YouTube' : 'Search on YouTube'}
              >
                <YouTubeIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                {!youtubeUrl && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
