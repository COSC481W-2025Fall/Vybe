'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { User, AlertCircle, Music, ArrowLeft, Clock, Play } from 'lucide-react';
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

export default function PublicProfilePage() {
  const pathname = usePathname();
  const router = useRouter();
  const { playSong } = useMiniplayer();

  // Normalize username from URL (lowercase)
  const username = (pathname?.split('/').pop() || '').toLowerCase();

  const [state, setState] = useState({
    loading: true,
    error: null,
    profile: null,
  });

  // Go back to previous page
  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    if (!username) return;

    let isMounted = true;

    async function loadProfile() {
      try {
        const url = `/api/public-profile/${encodeURIComponent(username)}`;
        console.log('[PublicProfile] Fetching:', url);

        const res = await fetch(url);

        if (!isMounted) return;

        console.log('[PublicProfile] status:', res.status);

        if (!res.ok) {
          setState({
            loading: false,
            error: 'Profile not found',
            profile: null,
          });
          return;
        }

        const data = await res.json();
        console.log('[PublicProfile] data:', data);

        setState({
          loading: false,
          error: null,
          profile: data.profile,
        });
      } catch (err) {
        console.error('[PublicProfile] error', err);
        if (!isMounted) return;
        setState({
          loading: false,
          error: 'Something went wrong loading this profile',
          profile: null,
        });
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [username]);

  const { loading, error, profile } = state;

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-card rounded-2xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Profile not found
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {error || 'We could not find this user.'}
          </p>
        </div>
      </div>
    );
  }

  // Public profile view
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 mb-4 px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary-bg)] rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="glass-card rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-[var(--secondary-bg)] border border-[var(--glass-border)] flex items-center justify-center">
              {profile.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt={profile.display_name || profile.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-[var(--muted-foreground)]" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">@{profile.username}</p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-1">Bio</h2>
              <p className="text-sm text-[var(--foreground)] whitespace-pre-line opacity-90">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Song of the Day */}
          {profile.song_of_the_day && (() => {
            const song = profile.song_of_the_day;
            // Use cleaned title/artist if available
            const displayTitle = song.parsed_title || song.title || 'Untitled';
            const displayArtist = song.parsed_artist || song.artist || 'Unknown Artist';
            
            // Generate URLs for both platforms
            const getSpotifyUrl = () => {
              if (song.spotify_url) return `${song.spotify_url}${song.spotify_url.includes('?') ? '&' : '?'}autoplay=true`;
              const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
              return `https://open.spotify.com/search/${searchQuery}`;
            };
            
            const getYouTubeUrl = () => {
              if (song.youtube_url) return `${song.youtube_url}${song.youtube_url.includes('?') ? '&' : '?'}autoplay=1`;
              const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
              return `https://www.youtube.com/results?search_query=${searchQuery}`;
            };
            
            const spotifyUrl = getSpotifyUrl();
            const youtubeUrl = getYouTubeUrl();
            const isSpotifyDirect = Boolean(song.spotify_url);
            const isYouTubeDirect = Boolean(song.youtube_url);

            // Handle playing in miniplayer
            const handlePlayInMiniplayer = () => {
              let platform = null;
              let external_id = null;

              if (song.spotify_url) {
                const spotifyMatch = song.spotify_url.match(/track\/([a-zA-Z0-9]+)/);
                if (spotifyMatch) {
                  platform = 'spotify';
                  external_id = spotifyMatch[1];
                }
              }
              
              if (!platform && song.youtube_url) {
                const ytMatch = song.youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
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

            const canPlayInMiniplayer = !!(song.spotify_url || song.youtube_url);

            return (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Song of the Day
                </h2>
                <button
                  onClick={canPlayInMiniplayer ? handlePlayInMiniplayer : undefined}
                  disabled={!canPlayInMiniplayer}
                  className={`w-full p-3 sm:p-4 bg-[var(--secondary-bg)] rounded-xl border border-[var(--glass-border)] text-left transition-all ${
                    canPlayInMiniplayer ? 'hover:bg-[var(--secondary-hover)] hover:border-[var(--glass-border-hover)] cursor-pointer group' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Album Art with play overlay */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                      {song.image_url ? (
                        <Image
                          src={song.image_url}
                          alt={displayTitle}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-5 w-5 sm:h-6 sm:w-6 text-white/70" />
                        </div>
                      )}
                      {/* Play overlay */}
                      {canPlayInMiniplayer && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-6 w-6 text-white" fill="currentColor" />
                        </div>
                      )}
                    </div>
                    
                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--foreground)] truncate text-sm sm:text-base">
                        {displayTitle}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--muted-foreground)] truncate">
                        {displayArtist}
                      </p>
                      {song.album && (
                        <p className="text-xs text-[var(--muted-foreground)] truncate opacity-70 hidden sm:block">
                          {song.album}
                        </p>
                      )}
                    </div>

                    {/* Platform Buttons - Always show both */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                          isSpotifyDirect 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30'
                        }`}
                        title={isSpotifyDirect ? 'Play on Spotify' : 'Search on Spotify'}
                        aria-label={isSpotifyDirect ? 'Play on Spotify' : 'Search on Spotify'}
                      >
                        <SpotifyIcon className="h-4 w-4" />
                      </a>
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                          isYouTubeDirect 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30'
                        }`}
                        title={isYouTubeDirect ? 'Play on YouTube' : 'Search on YouTube'}
                        aria-label={isYouTubeDirect ? 'Play on YouTube' : 'Search on YouTube'}
                      >
                        <YouTubeIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </button>
                {song.shared_at && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Shared {new Date(song.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} today
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
