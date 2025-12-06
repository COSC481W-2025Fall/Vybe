'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from "../ui/dialog";
import { Music, ExternalLink, Clock, User } from "lucide-react";

/**
 * FriendSongCard - Expanded card showing a friend's song of the day
 * Shows larger thumbnail, user info, song details, and external links
 */
export function FriendSongCard({ song, open, onOpenChange }) {
  const router = useRouter();
  
  if (!song) return null;

  const spotifyUrl = song.spotify_url || song.spotifyUrl;
  const youtubeUrl = song.youtube_url || song.youtubeUrl;
  const hasSpotify = Boolean(spotifyUrl);
  const hasYouTube = Boolean(youtubeUrl);
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
                {song.title || 'Untitled'}
              </h2>
              <p className="text-lg text-white/80 drop-shadow">
                {song.artist || 'Unknown Artist'}
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

            {/* External Links */}
            {(hasSpotify || hasYouTube) && (
              <div className="flex gap-3">
                {hasSpotify && (
                  <a
                    href={`${spotifyUrl}${spotifyUrl?.includes('?') ? '&' : '?'}autoplay=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                    aria-label={`Play ${song.title} on Spotify (opens in new tab)`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Play on Spotify
                  </a>
                )}
                {hasYouTube && (
                  <a
                    href={`${youtubeUrl}${youtubeUrl?.includes('?') ? '&' : '?'}autoplay=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                    aria-label={`Play ${song.title} on YouTube (opens in new tab)`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Play on YouTube
                  </a>
                )}
              </div>
            )}

            {/* No links fallback */}
            {!hasSpotify && !hasYouTube && (
              <p className="text-center text-sm text-[var(--muted-foreground)] py-2">
                No streaming links available
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

