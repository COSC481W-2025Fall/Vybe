// app/profile/page.jsx
'use client';

import SongSearchModal from '@/components/SongSearchModal';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Music, Users, UserCheck, X, ExternalLink, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGroups } from '@/hooks/useGroups';

export default function ProfilePage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSongSearchModal, setShowSongSearchModal] = useState(false);
  const [songOfDay, setSongOfDay] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Use the same hook as My Groups page for consistent group count
  const { groups, loading: groupsLoading } = useGroups();

  useEffect(() => {
    loadProfileData();
  }, []);

  async function loadProfileData() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      router.push('/sign-in');
      return;
    }

    setUser(session.user);

    // Load all data in parallel
    await Promise.all([
      fetchProfile(),
      fetchSongOfDay(),
      fetchFriendsCount()
    ]);

    setLoading(false);
  }

  const fetchFriendsCount = async () => {
    try {
      setFriendsLoading(true);
      const response = await fetch('/api/friends');
      const data = await response.json();
      if (data.success) {
        setFriendsCount(data.friends?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching friends count:', error);
    } finally {
      setFriendsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data && !data.error) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSongOfDay = async () => {
    try {
      const response = await fetch('/api/song-of-the-day');
      const data = await response.json();
      if (data.success && data.songOfDay) {
        setSongOfDay(data.songOfDay);
      }
    } catch (error) {
      console.error('Error fetching song of the day:', error);
    }
  };

  const searchAndOpenYouTubeVideo = async (songTitle, artist) => {
    try {
      // Construct search query
      const query = encodeURIComponent(`${songTitle} ${artist} official music video`);

      // Search YouTube for the first music video
      const response = await fetch(`/api/youtube/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${query}&maxResults=1`);

      if (!response.ok) {
        // If API fails, fall back to regular search
        window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
        return;
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        // Open the video directly
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
      } else {
        // Fallback to regular search if no results
        window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
      }
    } catch (error) {
      // Silently fallback to regular search if anything fails
      const query = encodeURIComponent(`${songTitle} ${artist}`);
      window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
    }
  };

  const handleSetSongOfDay = async (song) => {
    try {
      console.log('Setting song of the day:', song);
      const response = await fetch('/api/song-of-the-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: song.id,
          songName: song.name,
          artist: song.artist,
          album: song.album,
          imageUrl: song.imageUrl,
          previewUrl: song.previewUrl,
          spotifyUrl: song.spotifyUrl,
          youtubeUrl: song.youtubeUrl,
        }),
      });

      const data = await response.json();
      console.log('Song of the day response:', data);
      if (data.success) {
        setSongOfDay(data.songOfDay);
        console.log('Song of the day set successfully:', data.songOfDay);
      } else {
        console.error('Failed to set song of the day:', data);
      }
    } catch (error) {
      console.error('Error setting song of the day:', error);
    }
  };

  const handleRemoveSongOfDay = async () => {
    try {
      const response = await fetch('/api/song-of-the-day', {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setSongOfDay(null);
      }
    } catch (error) {
      console.error('Error removing song of the day:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-[var(--foreground)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]"></div>
              <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Get display name, avatar, and bio from profile
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.profile_picture_url || null;
  const bio = profile?.bio || null;

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8">

        {/* Profile Info Section */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Profile Picture */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Profile Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                    {displayName}
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)] truncate">{user.email}</p>
                  {bio && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-2 line-clamp-2">
                      {bio}
                    </p>
                  )}
                </div>
                {/* Edit Profile Button */}
                <a
                  href="/settings/profile"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 [data-theme='light']:bg-black/5 hover:bg-white/20 [data-theme='light']:hover:bg-black/10 text-[var(--foreground)] rounded-lg text-sm font-medium transition-colors border border-white/20 [data-theme='light']:border-black/20 flex-shrink-0"
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </a>
              </div>

              {/* Stats - Left Aligned */}
              <div className="flex gap-6 mt-4">
                <div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">{groupsLoading ? '...' : groups.length}</span>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">Groups</p>
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <UserCheck className="h-4 w-4 text-green-400" />
                    <span className="font-medium">{friendsLoading ? '...' : friendsCount}</span>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">Friends</p>
                </div>
              </div>
          </div>
          </div>
        </div>

        {/* Song of the Day Section */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-subtitle flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <span>Song of the Day</span>
            </h3>
            {songOfDay && (
              <button
                onClick={handleRemoveSongOfDay}
                className="p-1 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 active:bg-white/10 [data-theme='light']:active:bg-black/10 rounded transition-colors"
                title="Remove song"
              >
                <X className="h-4 w-4 text-[var(--muted-foreground)]" />
              </button>
            )}
          </div>

          {songOfDay ? (
            <div className="flex items-center gap-4">
              {songOfDay.image_url && (
                <img
                  src={songOfDay.image_url}
                  alt={songOfDay.album}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base sm:text-lg truncate text-[var(--foreground)]">{songOfDay.song_name}</h4>
                <p className="text-sm sm:text-base text-[var(--muted-foreground)] truncate">{songOfDay.artist}</p>
                <p className="text-xs sm:text-sm text-[var(--muted-foreground)] opacity-80 truncate">{songOfDay.album}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3">
                  <button
                    onClick={() => setShowSongSearchModal(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 btn-secondary rounded-lg text-sm sm:text-base"
                  >
                    Change Song
                  </button>
                  {songOfDay.spotify_url && (
                    <a
                      href={songOfDay.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 btn-secondary hover:!bg-green-600 active:!bg-green-700 hover:!text-white hover:!border-green-500 rounded-lg text-sm sm:text-base"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in Spotify
                    </a>
                  )}
                  {songOfDay.youtube_url && (
                    <a
                      href={songOfDay.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 btn-secondary hover:!bg-red-600 active:!bg-red-700 hover:!text-white hover:!border-red-500 rounded-lg text-sm sm:text-base"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="section-title mb-2 text-lg sm:text-xl">No song of the day yet</h3>
              <p className="section-subtitle text-xs sm:text-sm mb-4">Share your current favorite song</p>
              <button
                onClick={() => setShowSongSearchModal(true)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 btn-primary rounded-lg text-sm sm:text-base"
              >
                Set Song of the Day
              </button>
            </div>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="h-16 sm:h-20"></div>
      </div>

      {/* Song Search Modal */}
      {showSongSearchModal && (
        <SongSearchModal
          onClose={() => setShowSongSearchModal(false)}
          onSelectSong={handleSetSongOfDay}
        />
      )}
    </div>
  );
}
