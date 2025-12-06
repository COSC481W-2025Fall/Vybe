'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { User, AlertCircle, Music, ArrowLeft, ExternalLink, Clock } from 'lucide-react';

export default function PublicProfilePage() {
  const pathname = usePathname();
  const router = useRouter();

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
          {profile.song_of_the_day && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                <Music className="h-4 w-4" />
                Song of the Day
              </h2>
              <div className="flex items-center gap-4 p-4 bg-[var(--secondary-bg)] rounded-xl border border-[var(--glass-border)]">
                {/* Album Art */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                  {profile.song_of_the_day.image_url ? (
                    <Image
                      src={profile.song_of_the_day.image_url}
                      alt={profile.song_of_the_day.title || 'Song artwork'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-6 w-6 text-white/70" />
                    </div>
                  )}
                </div>
                
                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--foreground)] truncate">
                    {profile.song_of_the_day.title || 'Untitled'}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] truncate">
                    {profile.song_of_the_day.artist || 'Unknown Artist'}
                  </p>
                  {profile.song_of_the_day.album && (
                    <p className="text-xs text-[var(--muted-foreground)] truncate opacity-70">
                      {profile.song_of_the_day.album}
                    </p>
                  )}
                </div>

                {/* External Links */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {profile.song_of_the_day.spotify_url && (
                    <a
                      href={`${profile.song_of_the_day.spotify_url}${profile.song_of_the_day.spotify_url.includes('?') ? '&' : '?'}autoplay=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                      title="Play on Spotify"
                      aria-label="Play on Spotify (opens in new tab)"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {profile.song_of_the_day.youtube_url && (
                    <a
                      href={`${profile.song_of_the_day.youtube_url}${profile.song_of_the_day.youtube_url.includes('?') ? '&' : '?'}autoplay=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                      title="Play on YouTube"
                      aria-label="Play on YouTube (opens in new tab)"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              {profile.song_of_the_day.shared_at && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Shared {new Date(profile.song_of_the_day.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} today
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
