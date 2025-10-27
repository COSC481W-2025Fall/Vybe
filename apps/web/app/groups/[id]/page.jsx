'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Heart, MoreVertical, Plus, ChevronDown } from 'lucide-react';

export default function GroupDetailPage({ params }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [groupId, setGroupId] = useState(null);
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);

  useEffect(() => {
    // Unwrap params Promise
    Promise.resolve(params).then((resolvedParams) => {
      setGroupId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (groupId) {
      checkAuth();
      loadGroupData();
    }
  }, [groupId]);

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist);
    }
  }, [selectedPlaylist]);

  async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      router.push('/sign-in');
      return;
    }

    setUser(session.user);
  }

  async function loadGroupData() {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !groupId) return;

    // Get group details
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      console.error('Error loading group:', groupError);
      router.push('/groups');
      return;
    }

    setGroup(groupData);

    // Get group members (owner + members)
    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_id, joined_at')
      .eq('group_id', groupId);

    // Combine owner and members with basic user data
    // Note: We'll use user_id to display. You can create a public 'profiles' table later for better UX
    const allMembers = [
      {
        user_id: groupData.owner_id,
        isOwner: true,
        joined_at: groupData.created_at,
        users: {
          id: groupData.owner_id,
          email: session.user.id === groupData.owner_id ? session.user.email : `User ${groupData.owner_id.slice(0, 8)}`,
          raw_user_meta_data: session.user.id === groupData.owner_id ? session.user.user_metadata : {}
        }
      },
      ...(memberData || []).map(m => ({
        ...m,
        isOwner: false,
        users: {
          id: m.user_id,
          email: session.user.id === m.user_id ? session.user.email : `User ${m.user_id.slice(0, 8)}`,
          raw_user_meta_data: session.user.id === m.user_id ? session.user.user_metadata : {}
        }
      }))
    ];

    setMembers(allMembers);

    // Get playlists associated with this group
    const { data: playlistData } = await supabase
      .from('group_playlists')
      .select('*')
      .eq('group_id', groupId);

    setPlaylists(playlistData || []);

    if (playlistData && playlistData.length > 0) {
      setSelectedPlaylist(playlistData[0].id);
    }

    setLoading(false);
  }

  async function loadPlaylistSongs(playlistId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get songs with like information
    const { data: songs } = await supabase
      .from('playlist_songs')
      .select(`
        *,
        song_likes (
          user_id
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    // Transform songs to include liked status
    const songsWithLikes = (songs || []).map(song => ({
      ...song,
      isLiked: song.song_likes?.some(like => like.user_id === session.user.id) || false,
      likeCount: song.song_likes?.length || 0,
    }));

    setPlaylistSongs(songsWithLikes);
  }

  async function toggleLikeSong(songId, isCurrentlyLiked) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (isCurrentlyLiked) {
      // Unlike
      await supabase
        .from('song_likes')
        .delete()
        .eq('song_id', songId)
        .eq('user_id', session.user.id);
    } else {
      // Like
      await supabase
        .from('song_likes')
        .insert({
          song_id: songId,
          user_id: session.user.id,
        });
    }

    // Reload songs to update like status
    loadPlaylistSongs(selectedPlaylist);
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400">Loading group...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{group?.name}</h1>
              <p className="text-gray-400 text-lg">{group?.description || 'No description'}</p>
            </div>
            <button
              onClick={() => setShowAddPlaylistModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Playlist
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Members List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Members</h2>
                <span className="text-gray-400">{members.length}</span>
              </div>

              <div className="space-y-3">
                {members.map((member, index) => (
                  <MemberCard key={member.user_id} member={member} index={index} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Playlist Songs */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              {/* Playlist Selector */}
              {playlists.length > 0 ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Select Playlist
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPlaylist || ''}
                        onChange={(e) => setSelectedPlaylist(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none cursor-pointer hover:bg-gray-750 transition-colors pr-10"
                      >
                        {playlists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id}>
                            {playlist.name} • {playlist.track_count || 0} tracks
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Playlist Header */}
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold mb-2">
                      {playlists.find(p => p.id === selectedPlaylist)?.name}
                    </h2>
                    <p className="text-gray-400">
                      {playlistSongs.length} tracks • {formatDuration(playlistSongs.reduce((acc, song) => acc + (song.duration || 0), 0))}
                    </p>
                  </div>

                  {/* Songs List */}
                  <div className="space-y-2">
                    {playlistSongs.length > 0 ? (
                      playlistSongs.map((song, index) => (
                        <SongItem
                          key={song.id}
                          song={song}
                          index={index}
                          onToggleLike={toggleLikeSong}
                          userId={user?.id}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <p>No songs in this playlist</p>
                      </div>
                    )}
                  </div>

                  {playlistSongs.length > 5 && (
                    <button className="w-full mt-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors">
                      View All {playlistSongs.length} Tracks
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <Users className="h-16 w-16 text-gray-600 mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
                  <p className="text-gray-400 mb-6">Add a playlist from YouTube or Spotify to get started</p>
                  <button
                    onClick={() => setShowAddPlaylistModal(true)}
                    className="px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-medium transition-colors"
                  >
                    Add Playlist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Playlist Modal */}
      {showAddPlaylistModal && groupId && (
        <AddPlaylistModal
          groupId={groupId}
          onClose={() => setShowAddPlaylistModal(false)}
          onSuccess={() => {
            setShowAddPlaylistModal(false);
            loadGroupData();
          }}
        />
      )}
    </div>
  );
}

function MemberCard({ member, index }) {
  const userName = member.users?.raw_user_meta_data?.full_name ||
                   member.users?.raw_user_meta_data?.name ||
                   member.users?.email?.split('@')[0] ||
                   'User';

  const userEmail = member.users?.email || '';
  const joinedDate = new Date(member.joined_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Generate a consistent color based on user ID
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
  ];
  const colorIndex = (member.user_id?.charCodeAt(0) || index) % colors.length;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-semibold text-lg flex-shrink-0`}>
        {userName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white truncate">{userName}</p>
          {member.isOwner && (
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs font-medium">
              Owner
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 truncate">{userEmail}</p>
        <p className="text-xs text-gray-500">Joined {joinedDate}</p>
      </div>
    </div>
  );
}

function SongItem({ song, index, onToggleLike, userId }) {
  const [isLiked, setIsLiked] = useState(song.isLiked || false);

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
    onToggleLike(song.id, isLiked);
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group">
      {/* Track Number */}
      <span className="text-gray-400 font-medium w-8 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Album Art */}
      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex-shrink-0 overflow-hidden">
        {song.thumbnail_url ? (
          <img src={song.thumbnail_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-xs">
            {song.title?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{song.title || 'Untitled'}</p>
        <p className="text-sm text-gray-400 truncate">{song.artist || 'Unknown Artist'}</p>
      </div>

      {/* Like Button */}
      <button
        onClick={handleLikeClick}
        className="p-2 hover:scale-110 transition-transform"
      >
        <Heart
          className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
        />
      </button>

      {/* Duration */}
      <span className="text-gray-400 text-sm w-12 text-right flex-shrink-0">
        {formatDuration(song.duration)}
      </span>
    </div>
  );
}

function AddPlaylistModal({ groupId, onClose, onSuccess }) {
  const supabase = supabaseBrowser();
  const [platform, setPlatform] = useState('youtube'); // 'youtube' or 'spotify'
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAddPlaylist(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Call API to import playlist
      const response = await fetch('/api/import-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          platform,
          playlistUrl,
          userId: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import playlist');
      }

      onSuccess();
    } catch (err) {
      console.error('Error importing playlist:', err);
      setError(err.message || 'Failed to import playlist');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-800">
        <h2 className="text-2xl font-bold mb-4">Add Playlist</h2>

        <form onSubmit={handleAddPlaylist}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform('youtube')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  platform === 'youtube'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => setPlatform('spotify')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  platform === 'spotify'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Spotify
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist URL
            </label>
            <input
              type="url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder={
                platform === 'youtube'
                  ? 'https://youtube.com/playlist?list=...'
                  : 'https://open.spotify.com/playlist/...'
              }
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !playlistUrl}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {loading ? 'Importing...' : 'Add Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
