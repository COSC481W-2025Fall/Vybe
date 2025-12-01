// app/profile/page.jsx
'use client';

import AddFriendsModal from '@/components/AddFriendsModal';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import SongSearchModal from '@/components/SongSearchModal';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Heart, Music, Users, X, ExternalLink, UserPlus, Mail, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useGroups } from '@/hooks/useGroups';

export default function ProfilePage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [showSongSearchModal, setShowSongSearchModal] = useState(false);
  const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [songOfDay, setSongOfDay] = useState(null);

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
      fetchFriends(),
      fetchSongOfDay()
    ]);

    setLoading(false);
  }

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

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();

      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
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
      <div className="min-h-screen flex items-center justify-center text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]"></div>
          <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Loading...</p>
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
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="font-medium">{friends.length}</span>
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
                  {songOfDay.youtube_url && songOfDay.youtube_url.includes('/watch?v=') && (
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
              <p className="section-subtitle text-xs sm:text-sm mb-4">Share your current favorite song with friends</p>
              <button
                onClick={() => setShowSongSearchModal(true)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 btn-primary rounded-lg text-sm sm:text-base"
              >
                Set Song of the Day
              </button>
            </div>
          )}
        </div>

        {/* Friends Section */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-subtitle flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Friends ({friends.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFriendRequestsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 [data-theme='light']:bg-black/5 hover:bg-white/20 [data-theme='light']:hover:bg-black/10 text-[var(--foreground)] rounded-lg text-sm font-medium transition-colors border border-white/20 [data-theme='light']:border-black/20"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Requests</span>
              </button>
              <button
                onClick={() => setShowAddFriendsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--foreground)] hover:bg-[var(--muted-foreground)] text-[var(--background)] rounded-lg text-sm font-medium transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Friend</span>
              </button>
            </div>
          </div>

          {friends.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="section-title mb-2 text-lg sm:text-xl">No friends yet</h3>
              <p className="section-subtitle text-xs sm:text-sm mb-4">Start connecting with friends to share music</p>
              <button
                onClick={() => setShowAddFriendsModal(true)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--foreground)] hover:bg-[var(--muted-foreground)] text-[var(--background)] rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Add Friends
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.slice(0, 5).map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center space-x-3 p-3 bg-white/5 [data-theme='light']:bg-black/5 rounded-lg border border-white/10 [data-theme='light']:border-black/10 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 active:bg-white/10 [data-theme='light']:active:bg-black/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {friend.name?.charAt(0).toUpperCase() || 'F'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)] truncate">{friend.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)] truncate">@{friend.username}</p>
                    {friend.bio && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2 opacity-80">
                        {friend.bio}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setFriendToRemove(friend);
                      setShowRemoveFriendModal(true);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                    title="Remove friend"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {friends.length > 5 && (
                <p className="text-sm text-[var(--muted-foreground)] text-center pt-2">
                  +{friends.length - 5} more friends
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="h-16 sm:h-20"></div>
      </div>

      {/* Add Friends Modal */}
      {showAddFriendsModal && (
        <AddFriendsModal
          onClose={() => {
            setShowAddFriendsModal(false);
            fetchFriends(); // Refresh friends list after closing modal
          }}
        />
      )}

      {/* Friend Requests Modal */}
      {showFriendRequestsModal && (
        <FriendRequestsModal
          onClose={() => {
            setShowFriendRequestsModal(false);
            fetchFriends(); // Refresh friends list after closing modal
          }}
        />
      )}

      {/* Song Search Modal */}
      {showSongSearchModal && (
        <SongSearchModal
          onClose={() => setShowSongSearchModal(false)}
          onSelectSong={handleSetSongOfDay}
        />
      )}

      {/* Remove Friend Confirmation Modal */}
      {showRemoveFriendModal && friendToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-white/20 [data-theme='light']:border-black/20 shadow-2xl">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Remove Friend?
            </h3>
            <p className="text-[var(--muted-foreground)] mb-6">
              Are you sure you want to remove <span className="font-semibold text-[var(--foreground)]">{friendToRemove.name}</span> from your friends?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveFriendModal(false);
                  setFriendToRemove(null);
                }}
                className="flex-1 px-4 py-2.5 bg-white/10 [data-theme='light']:bg-black/5 hover:bg-white/20 [data-theme='light']:hover:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors border border-white/20 [data-theme='light']:border-black/20"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/friends', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ friendId: friendToRemove.id }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to remove friend');
                    }

                    // Refresh friends list
                    setFriends(friends.filter(f => f.id !== friendToRemove.id));
                    toast.success(`${friendToRemove.name} has been removed from your friends.`);
                    setShowRemoveFriendModal(false);
                    setFriendToRemove(null);
                  } catch (error) {
                    console.error('Error removing friend:', error);
                    toast.error(error.message || 'Failed to remove friend. Please try again.');
                    setShowRemoveFriendModal(false);
                    setFriendToRemove(null);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
