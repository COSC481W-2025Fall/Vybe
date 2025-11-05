// app/profile/page.jsx
'use client';

import AddFriendsModal from '@/components/AddFriendsModal';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import SongSearchModal from '@/components/SongSearchModal';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Calendar, Heart, Mail, Music, Settings, UserPlus, Users, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [showSongSearchModal, setShowSongSearchModal] = useState(false);
  const [groupsCount, setGroupsCount] = useState(0);
  const [songOfDay, setSongOfDay] = useState(null);

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
      fetchFriends(),
      fetchGroupsCount(),
      fetchSongOfDay()
    ]);

    setLoading(false);
  }

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

  const fetchGroupsCount = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      if (data.success) {
        setGroupsCount(data.groups?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-white"></div>
          <p className="text-gray-400 text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Get user joined date
  const joinedDate = new Date(user.created_at).toLocaleDateString();

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8">
        {/* Profile Header Card */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="page-title text-xl sm:text-2xl">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h2>
                <p className="section-subtitle text-xs sm:text-sm">{user.email}</p>
                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2">
                  <Calendar className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white/60">
                    Joined {joinedDate}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Music className="h-4 w-4 text-purple-400" />
                    <span className="font-medium">{songOfDay ? '1' : '0'}</span>
                  </div>
                  <p className="text-sm text-white/60">Song Today</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">{groupsCount}</span>
                  </div>
                  <p className="text-sm text-white/60">Groups</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="font-medium">{friends.length}</span>
                  </div>
                  <p className="text-sm text-white/60">Friends</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowFriendRequestsModal(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
              >
                <Mail className="h-4 w-4" />
                Requests
              </button>
              <button
                onClick={() => setShowAddFriendsModal(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                <UserPlus className="h-4 w-4" />
                Add Friend
              </button>
              <Link
                href="/settings"
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
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
                className="p-1 hover:bg-white/10 active:bg-white/10 rounded transition-colors"
                title="Remove song"
              >
                <X className="h-4 w-4 text-white/60" />
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
                <h4 className="font-semibold text-base sm:text-lg truncate text-white">{songOfDay.song_name}</h4>
                <p className="text-sm sm:text-base text-white/60 truncate">{songOfDay.artist}</p>
                <p className="text-xs sm:text-sm text-white/40 truncate">{songOfDay.album}</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3">
                  <button
                    onClick={() => setShowSongSearchModal(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
                  >
                    Change Song
                  </button>
                  {user?.app_metadata?.provider === 'google' && songOfDay.youtube_url ? (
                    <a
                      href={songOfDay.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in YouTube
                    </a>
                  ) : songOfDay.spotify_url ? (
                    <a
                      href={songOfDay.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in Spotify
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="h-12 w-12 sm:h-16 sm:w-16 text-white/60 mx-auto mb-4" />
              <h3 className="section-title mb-2 text-lg sm:text-xl">No song of the day yet</h3>
              <p className="section-subtitle text-xs sm:text-sm mb-4">Share your current favorite song with friends</p>
              <button
                onClick={() => setShowSongSearchModal(true)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Set Song of the Day
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Activity */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <h3 className="section-subtitle flex items-center space-x-2 mb-4">
              <Users className="h-5 w-5" />
              <span>Recent Activity</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Groups joined this week</span>
                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/10 rounded-full text-xs sm:text-sm text-white backdrop-blur-sm">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Songs shared this month</span>
                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/10 rounded-full text-xs sm:text-sm text-white backdrop-blur-sm">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Playlists collaborated on</span>
                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/10 rounded-full text-xs sm:text-sm text-white backdrop-blur-sm">0</span>
              </div>
            </div>
          </div>

          {/* Friends Section */}
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-subtitle flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Friends ({friends.length})</span>
              </h3>
            </div>

            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 sm:h-16 sm:w-16 text-white/60 mx-auto mb-4" />
                <h3 className="section-title mb-2 text-lg sm:text-xl">No friends yet</h3>
                <p className="section-subtitle text-xs sm:text-sm mb-4">Start connecting with friends to share music</p>
                <button
                  onClick={() => setShowAddFriendsModal(true)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Add Friends
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 active:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {friend.name?.charAt(0).toUpperCase() || 'F'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{friend.name}</p>
                      <p className="text-sm text-white/60 truncate">@{friend.username}</p>
                    </div>
                  </div>
                ))}
                {friends.length > 5 && (
                  <p className="text-sm text-white/60 text-center pt-2">
                    +{friends.length - 5} more friends
                  </p>
                )}
              </div>
            )}
          </div>
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
    </div>
  );
}
