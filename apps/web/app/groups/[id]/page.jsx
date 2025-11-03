'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Heart, MoreVertical, Plus } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export default function GroupDetailPage({ params }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [groupId, setGroupId] = useState(null);
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('all');
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [actualTrackCounts, setActualTrackCounts] = useState({});
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

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
    if (selectedPlaylist && playlists.length > 0) {
      setShowAllSongs(false); // Reset when switching playlists
      loadPlaylistSongs(selectedPlaylist);
    }
  }, [selectedPlaylist, playlists]);

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

    // Fetch owner user data - only select fields that exist in the users table
    let ownerUser = null;
    const { data: ownerUserData, error: ownerError } = await supabase
      .from('users')
      .select('id, username, profile_picture_url')
      .eq('id', groupData.owner_id)
      .maybeSingle();

    if (ownerError) {
      console.error('Error fetching owner user:', ownerError);
      // Fallback: use session user data if it's the current user
      if (session?.user?.id === groupData.owner_id) {
        ownerUser = {
          id: session.user.id,
          username: session.user.email?.split('@')[0],
          profile_picture_url: session.user.user_metadata?.avatar_url || null
        };
      }
    } else {
      ownerUser = ownerUserData;
    }

    // Fetch all member users data
    const memberUserIds = (memberData || []).map(m => m.user_id);
    let memberUsers = [];

    if (memberUserIds.length > 0) {
      const { data: memberUsersData, error: memberUsersError } = await supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .in('id', memberUserIds);

      if (memberUsersError) {
        console.error('Error fetching member users:', memberUsersError);
        // Continue without member user data rather than failing
        memberUsers = [];
      } else {
        memberUsers = memberUsersData || [];
      }
    }

    // Combine owner and members with full user data
    // Always include the owner, even if user data is missing
    const ownerMember = {
      user_id: groupData.owner_id,
      isOwner: true,
      joined_at: groupData.created_at,
      users: ownerUser || {
        id: groupData.owner_id,
        username: null,
        email: null,
        profile_picture_url: null
      }
    };

    const otherMembers = (memberData || [])
      .map(m => ({
        ...m,
        isOwner: false,
        users: memberUsers?.find(u => u.id === m.user_id)
      }))
      .filter(m => m.users); // Only filter out non-owner members without user data

    const allMembers = [ownerMember, ...otherMembers];

    setMembers(allMembers);

    // Get playlists associated with this group
    const { data: playlistData } = await supabase
      .from('group_playlists')
      .select('*')
      .eq('group_id', groupId);

    setPlaylists(playlistData || []);

    // Get actual song counts for each playlist
    if (playlistData && playlistData.length > 0) {
      const counts = {};
      for (const playlist of playlistData) {
        const { count } = await supabase
          .from('playlist_songs')
          .select('*', { count: 'exact', head: true })
          .eq('playlist_id', playlist.id);
        counts[playlist.id] = count || 0;
      }
      setActualTrackCounts(counts);
    }

    // Always start with "all" view to show merged playlists
    setSelectedPlaylist('all');

    setLoading(false);
  }

  async function loadPlaylistSongs(playlistId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let songs;

    if (playlistId === 'all') {
      // Load all songs from all playlists in this group
      const playlistIds = playlists.map(p => p.id);

      if (playlistIds.length === 0) {
        setPlaylistSongs([]);
        return;
      }

      // Fetch songs in batches to bypass the 1000 row limit
      let allSongs = [];
      let rangeStart = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: songsError } = await supabase
          .from('playlist_songs')
          .select(`
            *,
            song_likes (
              user_id
            ),
            group_playlists!inner (
              id,
              name,
              platform
            )
          `)
          .in('playlist_id', playlistIds)
          .order('created_at', { ascending: true })
          .range(rangeStart, rangeStart + batchSize - 1);

        if (songsError) {
          console.error('[Groups] Error loading songs:', songsError);
          break;
        }

        if (batch && batch.length > 0) {
          allSongs = [...allSongs, ...batch];
          rangeStart += batchSize;
          hasMore = batch.length === batchSize; // Continue if we got a full batch
        } else {
          hasMore = false;
        }
      }

      console.log('[Groups] Loaded songs count:', allSongs?.length);
      songs = allSongs;
    } else {
      // Get songs from specific playlist - also use batching
      let allPlaylistSongs = [];
      let rangeStart = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: playlistError } = await supabase
          .from('playlist_songs')
          .select(`
            *,
            song_likes (
              user_id
            ),
            group_playlists!inner (
              id,
              name,
              platform
            )
          `)
          .eq('playlist_id', playlistId)
          .order('position', { ascending: true })
          .range(rangeStart, rangeStart + batchSize - 1);

        if (playlistError) {
          console.error('[Groups] Error loading playlist songs:', playlistError);
          break;
        }

        if (batch && batch.length > 0) {
          allPlaylistSongs = [...allPlaylistSongs, ...batch];
          rangeStart += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      songs = allPlaylistSongs;
    }

    // Transform songs to include liked status and playlist info
    const songsWithLikes = (songs || []).map(song => ({
      ...song,
      isLiked: song.song_likes?.some(like => like.user_id === session.user.id) || false,
      likeCount: song.song_likes?.length || 0,
      playlistName: song.group_playlists?.name || 'Unknown',
      platform: song.group_playlists?.platform || 'unknown',
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
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title mb-1">{group?.name}</h1>
              <p className="section-subtitle">{group?.description || 'No description'}</p>
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
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        <div className="w-full">
          {/* Playlist Songs */}
          <div className="w-full">
            <div className="glass-card rounded-2xl p-6">
              {/* Playlist Selector */}
              {playlists.length > 0 ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Select Playlist
                    </label>
                    <div className="relative">
                      <Select value={selectedPlaylist || 'all'} onValueChange={setSelectedPlaylist}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder="Select a playlist"
                            aria-label="playlist-select"
                          />
                        </SelectTrigger>
                        <SelectContent className="min-w-[240px]">
                          <SelectItem value="all">
                            All Playlists • {Object.values(actualTrackCounts).reduce((sum, count) => sum + count, 0)} tracks
                          </SelectItem>
                          {playlists.map((playlist) => (
                            <SelectItem key={playlist.id} value={String(playlist.id)}>
                              {playlist.name} • {actualTrackCounts[playlist.id] ?? playlist.track_count ?? 0} tracks
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Playlist Header */}
                  <div className="mb-6">
                    <h2 className="section-title mb-1">
                      {selectedPlaylist === 'all' ? 'All Playlists' : playlists.find(p => p.id === selectedPlaylist)?.name}
                    </h2>
                    <p className="section-subtitle">
                      {playlistSongs.length} tracks • {formatDuration(playlistSongs.reduce((acc, song) => acc + (song.duration || 0), 0))}
                    </p>
                  </div>

                  {/* Songs List */}
                  <div className="space-y-2">
                    {playlistSongs.length > 0 ? (
                      (showAllSongs ? playlistSongs : playlistSongs.slice(0, 20)).map((song, index) => (
                        <SongItem
                          key={song.id}
                          song={song}
                          index={index}
                          onToggleLike={toggleLikeSong}
                          userId={user?.id}
                          onPlay={setCurrentlyPlaying}
                          isPlaying={currentlyPlaying?.id === song.id}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <p>No songs in this playlist</p>
                      </div>
                    )}
                  </div>

                  {playlistSongs.length > 20 && !showAllSongs && (
                    <button
                      onClick={() => setShowAllSongs(true)}
                      className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/15"
                    >
                      View All {playlistSongs.length} Tracks
                    </button>
                  )}

                  {showAllSongs && playlistSongs.length > 20 && (
                    <button
                      onClick={() => {
                        setShowAllSongs(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/15"
                    >
                      Show Less
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <Users className="h-16 w-16 text-gray-600 mb-4 mx-auto" />
                  <h3 className="section-title mb-2">No playlists yet</h3>
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

      {/* Embedded Player */}
      {currentlyPlaying && (
        <EmbeddedPlayer
          song={currentlyPlaying}
          onClose={() => setCurrentlyPlaying(null)}
        />
      )}
    </div>
  );
}

function SongItem({ song, index, onToggleLike, userId, onPlay, isPlaying }) {
  const [isLiked, setIsLiked] = useState(song.isLiked || false);

  const handleLikeClick = (e) => {
    e.stopPropagation(); // Prevent opening player when clicking like button
    setIsLiked(!isLiked);
    onToggleLike(song.id, isLiked);
  };

  const handleSongClick = () => {
    onPlay(song);
  };

  return (
    <div
      onClick={handleSongClick}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group cursor-pointer"
    >
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
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm text-gray-400 truncate flex-shrink">{song.artist || 'Unknown Artist'}</p>
          {song.playlistName && (
            <>
              <span className="text-gray-600 flex-shrink-0">•</span>
              <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap ${
                song.platform === 'youtube'
                  ? 'bg-red-900/30 text-red-400'
                  : song.platform === 'spotify'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-gray-700/30 text-gray-400'
              }`}>
                {song.platform === 'youtube' ? 'YT' : song.platform === 'spotify' ? 'Spotify' : song.platform}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Like Button */}
      <button
        onClick={handleLikeClick}
        className="p-2 hover:scale-110 transition-transform z-10"
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
  const [platform, setPlatform] = useState('spotify'); // 'youtube' or 'spotify'
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPlaylists, setFetchingPlaylists] = useState(false);
  const [error, setError] = useState('');
  const [hasSpotify, setHasSpotify] = useState(false);
  const [hasYoutube, setHasYoutube] = useState(false);
  const [userExistingPlaylist, setUserExistingPlaylist] = useState(null);

  useEffect(() => {
    checkConnectedAccounts();
    checkUserExistingPlaylist();
  }, []);

  useEffect(() => {
    if (platform === 'spotify' && hasSpotify) {
      fetchSpotifyPlaylists();
    } else if (platform === 'youtube' && hasYoutube) {
      fetchYoutubePlaylists();
    }
  }, [platform]);

  async function checkUserExistingPlaylist() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check if user already has a playlist in this group
    const { data: existingPlaylist } = await supabase
      .from('group_playlists')
      .select('name, platform')
      .eq('group_id', groupId)
      .eq('added_by', session.user.id)
      .maybeSingle();

    setUserExistingPlaylist(existingPlaylist);
  }

  async function checkConnectedAccounts() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get the provider from database (set during login)
    const { data: userData } = await supabase
      .from('users')
      .select('last_used_provider')
      .eq('id', session.user.id)
      .maybeSingle();

    const provider = userData?.last_used_provider;
    console.log('[Groups] User provider:', provider);

    if (provider === 'spotify') {
      setHasSpotify(true);
      setHasYoutube(false);
      setPlatform('spotify');
      fetchSpotifyPlaylists();
    } else if (provider === 'google') {
      setHasSpotify(false);
      setHasYoutube(true);
      setPlatform('youtube');
      fetchYoutubePlaylists();
    } else {
      // Fallback - check identities
      const identities = session.user.identities || [];
      const hasGoogle = identities.some(id => id.provider === 'google');
      const hasSpotifyIdentity = identities.some(id => id.provider === 'spotify');

      console.log('[Groups] Fallback - checking identities. Google:', hasGoogle, 'Spotify:', hasSpotifyIdentity);

      // Set both if both exist, but prioritize the most recent one
      if (hasGoogle && hasSpotifyIdentity) {
        // Both are connected - check which was most recently used
        const sortedIdentities = [...identities].sort((a, b) => {
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
        const mostRecent = sortedIdentities[0]?.provider;

        if (mostRecent === 'google') {
          setHasYoutube(true);
          setHasSpotify(true);
          setPlatform('youtube');
          fetchYoutubePlaylists();
        } else {
          setHasSpotify(true);
          setHasYoutube(true);
          setPlatform('spotify');
          fetchSpotifyPlaylists();
        }
      } else if (hasSpotifyIdentity) {
        setHasSpotify(true);
        setHasYoutube(false);
        setPlatform('spotify');
        fetchSpotifyPlaylists();
      } else if (hasGoogle) {
        setHasYoutube(true);
        setHasSpotify(false);
        setPlatform('youtube');
        fetchYoutubePlaylists();
      } else {
        console.log('[Groups] No identities found');
      }
    }
  }

  async function fetchSpotifyPlaylists() {
    setFetchingPlaylists(true);
    setError('');
    try {
      const response = await fetch('/api/spotify/me/playlists?limit=50');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch Spotify playlists');
      }

      setPlaylists(data.items || []);
    } catch (err) {
      console.error('Error fetching Spotify playlists:', err);
      setError('Failed to load Spotify playlists. Please try reconnecting your account.');
    } finally {
      setFetchingPlaylists(false);
    }
  }

  async function fetchYoutubePlaylists() {
    setFetchingPlaylists(true);
    setError('');
    try {
      const response = await fetch('/api/youtube/youtube/v3/playlists?part=snippet&mine=true&maxResults=50');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch YouTube playlists');
      }

      setPlaylists(data.items || []);
    } catch (err) {
      console.error('Error fetching YouTube playlists:', err);
      setError('Failed to load YouTube playlists. Please try reconnecting your account.');
    } finally {
      setFetchingPlaylists(false);
    }
  }

  async function handleAddPlaylist(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const selectedPlaylist = playlists.find(p =>
        platform === 'spotify' ? p.id === selectedPlaylistId : p.id === selectedPlaylistId
      );

      if (!selectedPlaylist) {
        throw new Error('Please select a playlist');
      }

      // Generate playlist URL based on platform
      let playlistUrl;
      if (platform === 'spotify') {
        playlistUrl = selectedPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${selectedPlaylist.id}`;
      } else {
        playlistUrl = `https://www.youtube.com/playlist?list=${selectedPlaylist.id}`;
      }

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

  if (!hasSpotify && !hasYoutube) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">No Accounts Connected</h2>
          <p className="text-gray-400 mb-6">
            Please connect your Spotify or YouTube account in Settings to add playlists to this group.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => window.location.href = '/settings'}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-800">
        <h2 className="text-2xl font-bold mb-4">
          {userExistingPlaylist ? 'Replace Your Playlist' : 'Add Playlist'}
        </h2>

        {userExistingPlaylist && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded text-yellow-400 text-sm">
            <p className="font-semibold mb-1">⚠️ You already have a playlist in this group</p>
            <p>
              Your current playlist "<strong>{userExistingPlaylist.name}</strong>" ({userExistingPlaylist.platform})
              will be removed and replaced with your new selection.
            </p>
          </div>
        )}

        <form onSubmit={handleAddPlaylist}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform('youtube')}
                disabled={!hasYoutube}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  platform === 'youtube'
                    ? 'bg-red-600 text-white'
                    : hasYoutube
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                YouTube {!hasYoutube && '(Not Connected)'}
              </button>
              <button
                type="button"
                onClick={() => setPlatform('spotify')}
                disabled={!hasSpotify}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  platform === 'spotify'
                    ? 'bg-green-600 text-white'
                    : hasSpotify
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                Spotify {!hasSpotify && '(Not Connected)'}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Playlist
            </label>
            {fetchingPlaylists ? (
              <div className="text-center py-8 text-gray-400">
                Loading playlists...
              </div>
            ) : playlists.length > 0 ? (
              <div className="max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded-md">
                {playlists.map((playlist) => {
                  const playlistName = platform === 'spotify'
                    ? playlist.name
                    : playlist.snippet?.title;
                  const playlistImage = platform === 'spotify'
                    ? playlist.images?.[0]?.url
                    : playlist.snippet?.thumbnails?.default?.url;
                  const trackCount = platform === 'spotify'
                    ? playlist.tracks?.total
                    : null;

                  return (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors ${
                        selectedPlaylistId === playlist.id ? 'bg-gray-700' : ''
                      }`}
                    >
                      {playlistImage && (
                        <img
                          src={playlistImage}
                          alt={playlistName}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium truncate">{playlistName}</p>
                        {trackCount !== null && (
                          <p className="text-sm text-gray-400">{trackCount} tracks</p>
                        )}
                      </div>
                      {selectedPlaylistId === playlist.id && (
                        <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No playlists found
              </div>
            )}
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
              disabled={loading || !selectedPlaylistId}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {loading
                ? (userExistingPlaylist ? 'Replacing...' : 'Adding...')
                : (userExistingPlaylist ? 'Replace Playlist' : 'Add Playlist')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmbeddedPlayer({ song, onClose }) {
  const getEmbedUrl = () => {
    if (song.platform === 'youtube') {
      return `https://www.youtube.com/embed/${song.external_id}?autoplay=1`;
    } else if (song.platform === 'spotify') {
      // Note: Spotify doesn't support autoplay in embeds due to browser policies
      return `https://open.spotify.com/embed/track/${song.external_id}?utm_source=generator&theme=0`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) return null;

  const playerWidth = song.platform === 'youtube' ? 360 : 400;
  const playerHeight = song.platform === 'youtube' ? 203 : 152; // 16:9 for YouTube

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ width: `${playerWidth}px` }}>
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={song.thumbnail_url}
            alt={song.title}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{song.title}</p>
            <p className="text-gray-400 text-xs truncate">{song.artist}</p>
          </div>
          {song.platform === 'spotify' && (
            <span className="ml-2 px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30 whitespace-nowrap flex-shrink-0">
              Click ▶
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <iframe
        src={embedUrl}
        width={playerWidth}
        height={playerHeight}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="block w-full"
      />
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
