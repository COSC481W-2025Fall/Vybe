'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Heart, Plus, Trash2, X, Sparkles, Loader2 } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ExportPlaylistButton from '@/components/ExportPlaylistButton';
import ExportToSpotifyButton from '@/components/ExportToSpotifyButton';

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
  const [hasYouTube, setHasYouTube] = useState(false);
  const [hasSpotify, setHasSpotify] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);

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

    // Check if user has YouTube/Google and Spotify connected
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.identities) {
      const hasGoogle = user.identities.some(id => id.provider === 'google');
      const hasSpotifyIdentity = user.identities.some(id => id.provider === 'spotify');
      setHasYouTube(hasGoogle);
      
      // Also check database for Spotify tokens
      const { data: spotifyToken } = await supabase
        .from('spotify_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setHasSpotify(hasSpotifyIdentity || !!spotifyToken);
    }
  }

  async function handleSmartSort() {
    if (!groupId || isSorting) return;
    
    setIsSorting(true);
    const mode = selectedPlaylist === 'all' ? 'all' : 'playlist';
    const modeMessage = mode === 'all' 
      ? 'Creating your vibe-sorted mix... This may take a minute.' 
      : 'Sorting playlist... This may take a minute.';
    
    console.log(`[Groups] 🎵 Starting smart sort - Mode: ${mode}, Playlist: ${selectedPlaylist}`);
    toast.info(modeMessage, { duration: 3000 });
    
    try {
      console.log(`[Groups] 📡 Calling API: /api/groups/${groupId}/smart-sort`);
      console.log(`[Groups] 📤 Request body:`, { mode });
      
      const response = await fetch(`/api/groups/${groupId}/smart-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      
      console.log(`[Groups] 📥 Response status:`, response.status, response.statusText);
      
      const data = await response.json();
      console.log(`[Groups] 📥 Response data:`, {
        success: data.success,
        mode: data.mode,
        songsProcessed: data.songsProcessed,
        hasSummary: !!data.summary,
        hasGenreDist: !!data.summary?.genreDistribution
      });
      
      if (!response.ok) {
        // Extract more detailed error message
        const errorMessage = data.error || data.message || 'Failed to sort playlists';
        
        // Check for specific error types
        if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
          throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and plan settings to enable smart sorting.');
        } else if (errorMessage.includes('rate limit')) {
          throw new Error('Rate limit reached. Please wait a moment and try again.');
        } else {
          throw new Error(errorMessage);
        }
      }
      
      const successMessage = mode === 'all'
        ? `Vibe mix created with ${data.songsProcessed || 0} songs!`
        : `Successfully sorted ${data.songsProcessed || 0} songs!`;
      
      toast.success(successMessage, { duration: 5000 });
      
      console.log(`[Groups] ✅ API call successful, reloading data...`);
      
      // CRITICAL: Verify the database was updated before reloading
      // This helps catch if the API saved but we're not reading it
      const { data: verifyGroup } = await supabase
        .from('groups')
        .select('all_songs_sort_order, all_songs_sorted_at')
        .eq('id', groupId)
        .single();
      
      if (verifyGroup) {
        const hasSortOrder = verifyGroup.all_songs_sort_order && verifyGroup.all_songs_sort_order.length > 0;
        console.log(`[Groups] 🔍 Verification check:`, {
          hasSortOrder,
          sortOrderLength: verifyGroup.all_songs_sort_order?.length || 0,
          sortedAt: verifyGroup.all_songs_sorted_at || 'N/A'
        });
        
        if (!hasSortOrder && mode === 'all') {
          console.error(`[Groups] ❌ WARNING: API returned success but database has no sort order!`);
          console.error(`[Groups]    This suggests the API didn't save correctly. Check server logs.`);
          toast.error('Sort completed but order was not saved. Please try again.', { duration: 7000 });
        } else if (hasSortOrder && mode === 'all') {
          console.log(`[Groups] ✅ Verified: Sort order saved successfully!`);
        }
      } else {
        console.warn(`[Groups] ⚠️  Could not verify sort order (group not found)`);
      }
      
      // Reload group data first to get the new sort order
      await loadGroupData();
      
      console.log(`[Groups] ✅ Group data reloaded, checking for sort order...`);
      
      // Small delay to ensure state is updated (React state updates are async)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reload songs to show the new order
      console.log(`[Groups] 🔄 Reloading songs for playlist: ${selectedPlaylist}`);
      await loadPlaylistSongs(selectedPlaylist);
      
      console.log(`[Groups] ✅ Sort complete!`);
    } catch (error) {
      console.error('[Groups] Error sorting:', error);
      toast.error(error.message || 'Failed to sort playlists. Please try again.', { duration: 7000 });
    } finally {
      setIsSorting(false);
    }
  }

  async function loadGroupData() {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !groupId) return;

    // Fetch group, members, and playlists in parallel
    const [groupResult, memberResult, playlistResult] = await Promise.all([
      supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single(),
      supabase
        .from('group_members')
        .select('user_id, joined_at')
        .eq('group_id', groupId),
      supabase
        .from('group_playlists')
        .select('*')
        .eq('group_id', groupId)
        .order('smart_sorted_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true })
    ]);

    const { data: groupData, error: groupError } = groupResult;
    const { data: memberData } = memberResult;
    const { data: playlistData } = playlistResult;

    if (groupError || !groupData) {
      console.error('[Groups] Error loading group:', groupError);
      router.push('/groups');
      return;
    }

    // Log sort order status for debugging
    if (groupData.all_songs_sort_order) {
      console.log(`[Groups] ✅ Loaded group with sort order: ${groupData.all_songs_sort_order.length} songs`);
      console.log(`[Groups]    Sorted at: ${groupData.all_songs_sorted_at || 'N/A'}`);
    } else {
      console.log(`[Groups] ℹ️  Group loaded, no sort order yet`);
    }

    setGroup(groupData);
    setPlaylists(playlistData || []);

    // Fetch owner and member users in parallel
    const memberUserIds = (memberData || []).map(m => m.user_id);
    const userFetchPromises = [
      supabase
        .from('users')
        .select('id, username, display_name, profile_picture_url')
        .eq('id', groupData.owner_id)
        .maybeSingle()
    ];

    if (memberUserIds.length > 0) {
      userFetchPromises.push(
        supabase
          .from('users')
          .select('id, username, display_name, profile_picture_url')
          .in('id', memberUserIds)
      );
    }

    const userResults = await Promise.all(userFetchPromises);
    const { data: ownerUserData, error: ownerError } = userResults[0];
    const { data: memberUsersData, error: memberUsersError } = memberUserIds.length > 0 ? userResults[1] : { data: [], error: null };

    // Handle owner user data
    let ownerUser = null;
    if (ownerError) {
      console.error('Error fetching owner user:', ownerError);
      // Fallback: use session user data if it's the current user
      if (session?.user?.id === groupData.owner_id) {
        ownerUser = {
          id: session.user.id,
          username: session.user.email?.split('@')[0],
          display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
          profile_picture_url: session.user.user_metadata?.avatar_url || null
        };
      }
    } else {
      ownerUser = ownerUserData;
    }

    // Handle member users data
    let memberUsers = [];
    if (memberUsersError) {
      console.error('Error fetching member users:', memberUsersError);
      memberUsers = [];
    } else {
      memberUsers = memberUsersData || [];
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
        display_name: null,
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

    // Get actual song counts for all playlists in parallel
    if (playlistData && playlistData.length > 0) {
      const countPromises = playlistData.map(playlist =>
        supabase
          .from('playlist_songs')
          .select('*', { count: 'exact', head: true })
          .eq('playlist_id', playlist.id)
          .then(result => ({ playlistId: playlist.id, count: result.count || 0 }))
      );

      const countResults = await Promise.all(countPromises);
      const counts = {};
      countResults.forEach(({ playlistId, count }) => {
        counts[playlistId] = count;
      });
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

      // CRITICAL: Fetch fresh group data to get latest sort order
      // This ensures we have the most up-to-date all_songs_sort_order
      // React state might be stale after async operations
      let currentGroup = group;
      const { data: freshGroupData } = await supabase
        .from('groups')
        .select('all_songs_sort_order, all_songs_sorted_at')
        .eq('id', groupId)
        .single();
      
      if (freshGroupData) {
        currentGroup = { ...currentGroup, ...freshGroupData };
        // Update state so UI reflects the change immediately
        setGroup(prev => ({ ...prev, ...freshGroupData }));
        console.log('[Groups] Fetched fresh group data:', {
          hasSortOrder: !!freshGroupData.all_songs_sort_order,
          sortOrderLength: freshGroupData.all_songs_sort_order?.length || 0
        });
      }

      // Fetch all songs from all playlists in parallel (much faster)
      const { data: allSongsData, error: songsError } = await supabase
        .from('playlist_songs')
        .select(`
          *,
          song_likes (
            user_id
          ),
          group_playlists!inner (
            id,
            name,
            platform,
            smart_sorted_order
          )
        `)
        .in('playlist_id', playlistIds)
        .order('smart_sorted_order', { ascending: true, nullsLast: true })
        .order('position', { ascending: true });

      if (songsError) {
        console.error('[Groups] Error loading songs:', songsError);
        setPlaylistSongs([]);
        return;
      }

      // Check if unified sort order exists (from "All" view sorting)
      // Use currentGroup (freshly fetched) instead of stale group state
      if (currentGroup?.all_songs_sort_order && Array.isArray(currentGroup.all_songs_sort_order) && currentGroup.all_songs_sort_order.length > 0) {
        console.log('[Groups] ✅ Using unified sort order from "All" view');
        console.log(`[Groups] Sort order has ${currentGroup.all_songs_sort_order.length} songs`);
        
        // Create a map for O(1) lookup: songId -> order index
        const sortOrderMap = new Map();
        currentGroup.all_songs_sort_order.forEach((songId, index) => {
          sortOrderMap.set(songId, index);
        });

        // Separate songs into: sorted (in order) and unsorted (newly added)
        const sortedSongs = [];
        const unsortedSongs = [];
        
        allSongsData.forEach(song => {
          if (sortOrderMap.has(song.id)) {
            sortedSongs.push(song);
          } else {
            unsortedSongs.push(song);
          }
        });

        // Sort the sorted songs by their order in all_songs_sort_order
        sortedSongs.sort((a, b) => {
          const orderA = sortOrderMap.get(a.id) ?? 99999;
          const orderB = sortOrderMap.get(b.id) ?? 99999;
          return orderA - orderB;
        });

        // Append unsorted songs at the end (newly added songs)
        songs = [...sortedSongs, ...unsortedSongs];
        
        console.log(`[Groups] ✅ Applied unified sort: ${sortedSongs.length} sorted, ${unsortedSongs.length} unsorted`);
        console.log(`[Groups] First 5 song IDs in order:`, sortedSongs.slice(0, 5).map(s => s.id));
        
        if (unsortedSongs.length > 0) {
          console.log(`[Groups] ${unsortedSongs.length} newly added song(s) appended to end`);
        }
      } else {
        // No unified sort - use playlist-based ordering (existing behavior)
        console.log('[Groups] No unified sort order, using playlist-based ordering');
        
        // First, get playlists in their smart-sorted order
        const sortedPlaylists = [...playlists].sort((a, b) => {
          if (a.smart_sorted_order !== null && b.smart_sorted_order !== null) {
            return a.smart_sorted_order - b.smart_sorted_order;
          }
          if (a.smart_sorted_order !== null) return -1;
          if (b.smart_sorted_order !== null) return 1;
          return new Date(a.created_at) - new Date(b.created_at);
        });

        // Create a map of playlist order for sorting
        const playlistOrderMap = new Map();
        sortedPlaylists.forEach((playlist, idx) => {
          playlistOrderMap.set(playlist.id, playlist.smart_sorted_order ?? idx + 1000);
        });

        // Sort songs: first by playlist order, then by song order within playlist
        songs = (allSongsData || []).sort((a, b) => {
          const playlistA = playlistOrderMap.get(a.playlist_id) ?? 1000;
          const playlistB = playlistOrderMap.get(b.playlist_id) ?? 1000;
          
          // If same playlist, sort by song order
          if (playlistA === playlistB) {
            const orderA = a.smart_sorted_order ?? a.position ?? 0;
            const orderB = b.smart_sorted_order ?? b.position ?? 0;
            return orderA - orderB;
          }
          
          // Otherwise sort by playlist order
          return playlistA - playlistB;
        });
      }
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
          .order('smart_sorted_order', { ascending: true, nullsLast: true })
          .order('position', { ascending: true })
          .range(rangeStart, rangeStart + batchSize - 1);
        
        console.log(`[Groups] Loaded batch: ${batch?.length || 0} songs (smart_sorted_order used)`);

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

  async function handleResetSort() {
    if (!groupId || isResetting) return;
    
    setIsResetting(true);
    
    try {
      const response = await fetch(`/api/groups/${groupId}/reset-sort`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset sort order');
      }
      
      toast.success('Sort order reset to default');
      
      // Reload to show original order
      await loadGroupData();
      await loadPlaylistSongs('all');
    } catch (error) {
      console.error('[Groups] Error resetting sort:', error);
      toast.error(error.message || 'Failed to reset sort order', { duration: 5000 });
    } finally {
      setIsResetting(false);
    }
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

  async function handleRemoveMember(member) {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.user_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      // Reload group data
      loadGroupData();
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      alert(error.message || 'Failed to remove member. Please try again.');
    }
  }

  async function handleDeleteGroup() {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete group');
      }

      // Redirect to groups page
      router.push('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert(error.message || 'Failed to delete group. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen text-[var(--foreground)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]"></div>
          <p className="text-[var(--muted-foreground)] text-sm sm:text-base">Loading group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title mb-1 text-xl sm:text-2xl">{group?.name}</h1>
              <p className="section-subtitle text-xs sm:text-sm">{group?.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {group?.owner_id === user?.id && (
                <button
                  onClick={() => setShowDeleteGroupModal(true)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors text-sm sm:text-base border border-red-600/30"
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Delete Group</span>
                </button>
              )}
              <button
                onClick={() => setShowAddPlaylistModal(true)}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                <Plus className="h-5 w-5" />
                Add Playlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="w-full">
          {/* Playlist Songs */}
          <div className="w-full">
            <div className="glass-card rounded-2xl p-6">
              {/* Playlist Selector */}
              {playlists.length > 0 ? (
                <>
                  {/* Smart Sort Section */}
                  <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Show "Vibe Mix Active" for "All" view when unified sort exists */}
                    {selectedPlaylist === 'all' && group?.all_songs_sort_order && group.all_songs_sort_order.length > 0 && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 flex-1">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-[var(--foreground)]">
                          <span className="font-medium text-purple-400">Vibe Mix Active</span>
                          {group.all_songs_sorted_at && (
                            <span className="text-[var(--muted-foreground)] ml-2">
                              (Sorted {new Date(group.all_songs_sorted_at).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Show "AI Smart Sort Active" for individual playlists */}
                    {selectedPlaylist !== 'all' && playlists.some(p => p.smart_sorted_order !== null) && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 flex-1">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-[var(--foreground)]">
                          <span className="font-medium">AI Smart Sort Active</span>
                          {playlists[0]?.last_sorted_at && (
                            <span className="text-[var(--muted-foreground)] ml-2">
                              (Sorted {new Date(playlists[0].last_sorted_at).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {/* Reset Order button - only show for "All" view when unified sort exists */}
                      {selectedPlaylist === 'all' && group?.all_songs_sort_order && group.all_songs_sort_order.length > 0 && (
                        <button
                          onClick={handleResetSort}
                          disabled={isResetting}
                          className="px-3 py-2 text-sm rounded-lg border border-[var(--muted-foreground)]/30 hover:bg-[var(--muted-foreground)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[var(--foreground)]"
                        >
                          {isResetting ? 'Resetting...' : 'Reset Order'}
                        </button>
                      )}
                      <button
                        onClick={handleSmartSort}
                        disabled={isSorting || playlists.length === 0}
                        title={selectedPlaylist === 'all' ? 'Sorts all songs by vibe: chill → energetic → wind down' : 'Sorts this playlist by AI recommendation'}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                      >
                        {isSorting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sorting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span>AI Smart Sort</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
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
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="section-title mb-1">
                          {selectedPlaylist === 'all' ? 'All Playlists' : playlists.find(p => p.id === selectedPlaylist)?.name}
                        </h2>
                        <p className="section-subtitle">
                          {playlistSongs.length} tracks • {formatDuration(playlistSongs.reduce((acc, song) => acc + (song.duration || 0), 0))}
                        </p>
                      </div>
                      {/* Export Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Export to Spotify Button - Only shown for Spotify-connected users */}
                        {hasSpotify && (
                          <ExportToSpotifyButton
                            sourceType="group"
                            sourceId={groupId}
                            playlistId={selectedPlaylist}
                            groupId={selectedPlaylist === 'all' ? groupId : undefined}
                            defaultName={
                              selectedPlaylist === 'all'
                                ? group?.name || 'Group Playlist'
                                : playlists.find(p => p.id === selectedPlaylist)?.name || 'Playlist'
                            }
                          />
                        )}
                        {/* Export to YouTube Button - Only shown for YouTube-connected users */}
                        {hasYouTube && (
                          <ExportPlaylistButton
                            sourceType="group"
                            sourceId={groupId}
                            playlistId={selectedPlaylist}
                            defaultName={
                              selectedPlaylist === 'all'
                                ? group?.name || 'Group Playlist'
                                : playlists.find(p => p.id === selectedPlaylist)?.name || 'Playlist'
                            }
                          />
                        )}
                      </div>
                    </div>
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
                      <div className="text-center py-12 text-[var(--muted-foreground)]">
                        <p>No songs in this playlist</p>
                      </div>
                    )}
                  </div>

                  {playlistSongs.length > 20 && !showAllSongs && (
                    <button
                      onClick={() => setShowAllSongs(true)}
                      className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 active:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:active:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/15 [data-theme='light']:border-black/15"
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
                      className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 active:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:active:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/15 [data-theme='light']:border-black/15"
                    >
                      Show Less
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <Users className="h-16 w-16 text-[var(--muted-foreground)] mb-4 mx-auto" />
                  <h3 className="section-title mb-2">No playlists yet</h3>
                  <p className="text-[var(--muted-foreground)] mb-6">Add a playlist from YouTube or Spotify to get started</p>
                  <button
                    onClick={() => setShowAddPlaylistModal(true)}
                    className="px-6 py-3 bg-white hover:bg-gray-200 active:bg-gray-200 [data-theme='light']:bg-white [data-theme='light']:hover:bg-gray-100 [data-theme='light']:active:bg-gray-100 text-black rounded-lg font-medium transition-colors border border-gray-300 [data-theme='light']:border-gray-300"
                  >
                    Add Playlist
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="mt-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </h2>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 bg-white/5 [data-theme='light']:bg-black/5 rounded-lg border border-white/10 [data-theme='light']:border-black/10 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {member.users?.profile_picture_url ? (
                      <img
                        src={member.users.profile_picture_url}
                        alt={member.users?.display_name || member.users?.username || 'User'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {(member.users?.display_name || member.users?.username)?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {member.users?.display_name || member.users?.username || 'Unknown User'}
                        {member.isOwner && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] rounded border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
                            Owner
                          </span>
                        )}
                      </p>
                      {member.users?.username && member.users?.display_name && (
                        <p className="text-sm text-[var(--muted-foreground)]">@{member.users.username}</p>
                      )}
                    </div>
                  </div>
                  {group?.owner_id === user?.id && !member.isOwner && (
                    <button
                      onClick={() => {
                        setMemberToRemove(member);
                        setShowRemoveMemberModal(true);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                      title="Remove member"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && memberToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-[var(--glass-border)] shadow-2xl">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Remove Member?
            </h3>
            <p className="text-[var(--muted-foreground)] mb-6">
              Are you sure you want to remove <span className="font-semibold text-[var(--foreground)]">
                {memberToRemove.users?.display_name || memberToRemove.users?.username || 'this member'}
              </span> from the group?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setMemberToRemove(null);
                }}
                className="flex-1 px-4 py-2.5 bg-white/10 [data-theme='light']:bg-black/5 hover:bg-white/20 [data-theme='light']:hover:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors border border-white/20 [data-theme='light']:border-black/20"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-[var(--glass-border)] shadow-2xl">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Delete Group?
            </h3>
            <p className="text-[var(--muted-foreground)] mb-6">
              Are you sure you want to delete <span className="font-semibold text-[var(--foreground)]">{group?.name}</span>? This action cannot be undone and will remove all playlists and members.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteGroupModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/10 [data-theme='light']:bg-black/5 hover:bg-white/20 [data-theme='light']:hover:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors border border-white/20 [data-theme='light']:border-black/20"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

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
      className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-white/5 [data-theme='light']:hover:bg-black/5 active:bg-white/5 [data-theme='light']:active:bg-black/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10 [data-theme='light']:hover:border-black/10"
    >
      {/* Track Number */}
      <span className="text-[var(--muted-foreground)] font-medium w-6 sm:w-8 text-center flex-shrink-0 text-sm sm:text-base">
        {index + 1}
      </span>

      {/* Album Art */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex-shrink-0 overflow-hidden">
        {song.thumbnail_url ? (
          <img src={song.thumbnail_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--foreground)] text-xs">
            {song.title?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Song Info - Takes priority and available space */}
      <div className="flex-1 min-w-0 pr-2 sm:pr-0">
        <p className="font-semibold text-[var(--foreground)] truncate text-sm sm:text-base">{song.title || 'Untitled'}</p>
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm text-[var(--muted-foreground)] truncate flex-1 min-w-0">{song.artist || 'Unknown Artist'}</p>
          {song.playlistName && (
            <>
              <span className="text-[var(--muted-foreground)] opacity-50 flex-shrink-0">•</span>
              <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap border ${
                song.platform === 'youtube'
                  ? 'bg-red-900/30 text-red-400 border-red-500/30'
                  : song.platform === 'spotify'
                  ? 'bg-green-900/30 text-green-400 border-green-500/30'
                  : 'bg-white/5 [data-theme=\'light\']:bg-black/5 text-[var(--muted-foreground)] border-white/10 [data-theme=\'light\']:border-black/10'
              }`}>
                {song.platform === 'youtube' ? 'YT' : song.platform === 'spotify' ? 'Spotify' : song.platform}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Like Button - Hidden on mobile, visible on desktop */}
      <button
        onClick={handleLikeClick}
        className="hidden sm:block p-2 hover:scale-110 transition-transform flex-shrink-0"
        aria-label={isLiked ? 'Unlike song' : 'Like song'}
      >
        <Heart
          className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-[var(--muted-foreground)]'}`}
        />
      </button>

      {/* Duration - Hidden on mobile, visible on desktop */}
      <span className="hidden sm:block text-[var(--muted-foreground)] text-sm w-12 text-right flex-shrink-0">
        {formatDuration(song.duration)}
      </span>
    </div>
  );
}

function AddPlaylistModal({ groupId, onClose, onSuccess }) {
  const supabase = supabaseBrowser();
  const [platform, setPlatform] = useState(null); // 'youtube', 'spotify', or null for 'all'
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [selectedPlaylistPlatform, setSelectedPlaylistPlatform] = useState(null);
  const [playlists, setPlaylists] = useState([]); // Array of { playlist, platform }
  const [loading, setLoading] = useState(false);
  const [fetchingPlaylists, setFetchingPlaylists] = useState(false);
  const [error, setError] = useState('');
  const [hasSpotify, setHasSpotify] = useState(false);
  const [hasYoutube, setHasYoutube] = useState(false);
  const [userExistingPlaylist, setUserExistingPlaylist] = useState(null);

  useEffect(() => {
    // Run these checks in parallel
    Promise.all([
      checkConnectedAccounts(),
      checkUserExistingPlaylist()
    ]);
  }, []);

  useEffect(() => {
    // Load playlists from all connected platforms
    if (hasSpotify || hasYoutube) {
      loadAllPlaylists();
    }
  }, [hasSpotify, hasYoutube]);

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
    // Use getUser() instead of getSession() to get fresh user data with identities
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Groups] No user found');
      return;
    }

    console.log('[Groups] User:', user.id);
    console.log('[Groups] User identities:', user.identities);

    // Use same logic as LibraryView - check last_used_provider from database
    const { data: userData } = await supabase
      .from('users')
      .select('last_used_provider')
      .eq('id', user.id)
      .maybeSingle();

    const lastUsedProvider = userData?.last_used_provider;

    // Check identities as fallback
    const identities = user.identities || [];
    const hasGoogle = identities.some(id => id.provider === 'google');
    const hasSpotify = identities.some(id => id.provider === 'spotify');

    console.log('[Groups] Last used provider from DB:', lastUsedProvider);
    console.log('[Groups] Identities - Google:', hasGoogle, 'Spotify:', hasSpotify);
    console.log('[Groups] Full identities array:', identities);

    // Determine provider (prioritize database value, then fall back to identities)
    let provider = null;

    if (lastUsedProvider === 'google' || lastUsedProvider === 'spotify') {
      provider = lastUsedProvider;
      console.log('[Groups] Using provider from DB:', provider);
    } else if (hasGoogle && !hasSpotify) {
      provider = 'google';
      console.log('[Groups] Only Google linked');
    } else if (hasSpotify && !hasGoogle) {
      provider = 'spotify';
      console.log('[Groups] Only Spotify linked');
    } else if (hasGoogle && hasSpotify) {
      // Both linked - sort by most recent updated_at
      const sortedIdentities = [...identities].sort((a, b) => {
        return new Date(b.updated_at) - new Date(a.updated_at);
      });
      provider = sortedIdentities[0]?.provider;
      console.log('[Groups] Both linked, using most recent:', provider);
    }

    console.log('[Groups] Final determined provider:', provider);

    // Set availability flags for both platforms
    setHasSpotify(hasSpotify);
    setHasYoutube(hasGoogle);

    // Set default platform: if both available, show all (null), otherwise show the only available one
    if (hasGoogle && hasSpotify) {
      // Both available, show all playlists by default
      setPlatform(null);
    } else if (hasGoogle && !hasSpotify) {
      setPlatform('youtube');
    } else if (hasSpotify && !hasGoogle) {
      setPlatform('spotify');
    }
  }

  async function loadAllPlaylists() {
    setFetchingPlaylists(true);
    setError('');
    const allPlaylists = [];
    const errors = [];

    // Load Spotify playlists if connected
    if (hasSpotify) {
      try {
        const response = await fetch('/api/spotify/me/playlists?limit=50');
        const data = await response.json();

        if (!response.ok) {
          errors.push('Spotify: ' + (data.error || 'Failed to fetch Spotify playlists'));
        } else {
          const items = (data.items || []).map(playlist => ({ playlist, platform: 'spotify' }));
          allPlaylists.push(...items);
        }
      } catch (err) {
        console.error('Error fetching Spotify playlists:', err);
        errors.push('Spotify: Failed to load playlists. Please try reconnecting your account.');
      }
    }

    // Load YouTube playlists if connected
    if (hasYoutube) {
      try {
        const response = await fetch('/api/youtube/youtube/v3/playlists?part=snippet&mine=true&maxResults=50');
        const data = await response.json();

        if (!response.ok) {
          errors.push('YouTube: ' + (data.error || 'Failed to fetch YouTube playlists'));
        } else {
          const items = (data.items || []).map(playlist => ({ playlist, platform: 'youtube' }));
          allPlaylists.push(...items);
        }
      } catch (err) {
        console.error('Error fetching YouTube playlists:', err);
        errors.push('YouTube: Failed to load playlists. Please try reconnecting your account.');
      }
    }

    setPlaylists(allPlaylists);
    setError(errors.length > 0 ? errors.join('; ') : '');
    setFetchingPlaylists(false);
  }

  async function handleAddPlaylist(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      if (!selectedPlaylistId || !selectedPlaylistPlatform) {
        throw new Error('Please select a playlist');
      }

      const selectedPlaylistData = playlists.find(p => 
        p.playlist.id === selectedPlaylistId && p.platform === selectedPlaylistPlatform
      );

      if (!selectedPlaylistData) {
        throw new Error('Selected playlist not found');
      }

      const selectedPlaylist = selectedPlaylistData.playlist;
      const playlistPlatform = selectedPlaylistData.platform;

      // Generate playlist URL based on platform
      let playlistUrl;
      if (playlistPlatform === 'spotify') {
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
          platform: playlistPlatform,
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
      <div className="fixed inset-0 bg-black/80 [data-theme='light']:bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="glass-card rounded-lg max-w-md w-full p-6 border border-white/20 [data-theme='light']:border-black/20">
          <h2 className="text-2xl font-bold mb-4 text-[var(--foreground)]">No Accounts Connected</h2>
          <p className="text-[var(--muted-foreground)] mb-6">
            Please connect your Spotify or YouTube account in Settings to add playlists to this group.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 active:bg-white/20 [data-theme='light']:active:bg-black/10 text-[var(--foreground)] rounded-md transition-colors border border-white/20 [data-theme='light']:border-black/20"
            >
              Close
            </button>
            <button
              onClick={() => window.location.href = '/settings'}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors border border-purple-500/30"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 [data-theme='light']:bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-lg max-w-md w-full p-6 border border-white/20 [data-theme='light']:border-black/20">
        <h2 className="text-2xl font-bold mb-4 text-[var(--foreground)]">
          {userExistingPlaylist ? 'Replace Your Playlist' : 'Add Playlist'}
        </h2>

        {userExistingPlaylist && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded text-yellow-400 text-sm">
            <p className="font-semibold mb-1">Warning: You already have a playlist in this group</p>
            <p>
              Your current playlist "<strong>{userExistingPlaylist.name}</strong>" ({userExistingPlaylist.platform})
              will be removed and replaced with your new selection.
            </p>
          </div>
        )}

        <form onSubmit={handleAddPlaylist}>
          {hasSpotify && hasYoutube && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Filter by Platform
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPlatform(null)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors border ${
                    platform === null
                      ? 'bg-purple-600 text-white border-purple-500/30'
                      : 'bg-white/10 [data-theme=\'light\']:bg-black/5 text-[var(--foreground)] hover:bg-white/20 [data-theme=\'light\']:hover:bg-black/10 active:bg-white/20 [data-theme=\'light\']:active:bg-black/10 border-white/20 [data-theme=\'light\']:border-black/20'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('youtube')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors border ${
                    platform === 'youtube'
                      ? 'bg-red-600 text-white border-red-500/30'
                      : 'bg-white/10 [data-theme=\'light\']:bg-black/5 text-[var(--foreground)] hover:bg-white/20 [data-theme=\'light\']:hover:bg-black/10 active:bg-white/20 [data-theme=\'light\']:active:bg-black/10 border-white/20 [data-theme=\'light\']:border-black/20'
                  }`}
                >
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('spotify')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors border ${
                    platform === 'spotify'
                      ? 'bg-green-600 text-white border-green-500/30'
                      : 'bg-white/10 [data-theme=\'light\']:bg-black/5 text-[var(--foreground)] hover:bg-white/20 [data-theme=\'light\']:hover:bg-black/10 active:bg-white/20 [data-theme=\'light\']:active:bg-black/10 border-white/20 [data-theme=\'light\']:border-black/20'
                  }`}
                >
                  Spotify
                </button>
              </div>
            </div>
          )}
          {((hasSpotify && !hasYoutube) || (!hasSpotify && hasYoutube)) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                {hasYoutube && (
                  <button
                    type="button"
                    onClick={() => setPlatform('youtube')}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors border ${
                      platform === 'youtube'
                        ? 'bg-red-600 text-white border-red-500/30'
                        : 'bg-white/10 [data-theme=\'light\']:bg-black/5 text-[var(--foreground)] hover:bg-white/20 [data-theme=\'light\']:hover:bg-black/10 active:bg-white/20 [data-theme=\'light\']:active:bg-black/10 border-white/20 [data-theme=\'light\']:border-black/20'
                    }`}
                  >
                    YouTube
                  </button>
                )}
                {hasSpotify && (
                  <button
                    type="button"
                    onClick={() => setPlatform('spotify')}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors border ${
                      platform === 'spotify'
                        ? 'bg-green-600 text-white border-green-500/30'
                        : 'bg-white/10 [data-theme=\'light\']:bg-black/5 text-[var(--foreground)] hover:bg-white/20 [data-theme=\'light\']:hover:bg-black/10 active:bg-white/20 [data-theme=\'light\']:active:bg-black/10 border-white/20 [data-theme=\'light\']:border-black/20'
                    }`}
                  >
                    Spotify
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Select Playlist
            </label>
            {fetchingPlaylists ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                Loading playlists...
              </div>
            ) : playlists.length > 0 ? (
              <div className="max-h-64 overflow-y-auto bg-white/5 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 rounded-md modal-scroll">
                {playlists
                  .filter(p => platform === null || p.platform === platform)
                  .map(({ playlist, platform: playlistPlatform }) => {
                    const playlistName = playlistPlatform === 'spotify'
                      ? playlist.name
                      : playlist.snippet?.title;
                    const playlistImage = playlistPlatform === 'spotify'
                      ? playlist.images?.[0]?.url
                      : playlist.snippet?.thumbnails?.default?.url;
                    const trackCount = playlistPlatform === 'spotify'
                      ? playlist.tracks?.total
                      : playlist.contentDetails?.itemCount;
                    const isSelected = selectedPlaylistId === playlist.id && selectedPlaylistPlatform === playlistPlatform;

                    return (
                      <button
                        key={`${playlistPlatform}-${playlist.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedPlaylistId(playlist.id);
                          setSelectedPlaylistPlatform(playlistPlatform);
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 active:bg-white/10 [data-theme='light']:active:bg-black/10 transition-colors border border-transparent hover:border-white/10 [data-theme='light']:hover:border-black/10 ${
                          isSelected ? 'bg-white/10 [data-theme=\'light\']:bg-black/10 border-white/20 [data-theme=\'light\']:border-black/20' : ''
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
                          <div className="flex items-center gap-2">
                            <p className="text-[var(--foreground)] font-medium truncate">{playlistName}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              playlistPlatform === 'spotify' 
                                ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                                : 'bg-red-600/20 text-red-400 border border-red-500/30'
                            }`}>
                              {playlistPlatform === 'spotify' ? 'Spotify' : 'YouTube'}
                            </span>
                          </div>
                          {trackCount !== null && trackCount !== undefined && (
                            <p className="text-sm text-[var(--muted-foreground)]">{trackCount} tracks</p>
                          )}
                        </div>
                        {isSelected && (
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
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                No playlists found
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 active:bg-white/20 [data-theme='light']:active:bg-black/10 text-[var(--foreground)] rounded-md transition-colors border border-white/20 [data-theme='light']:border-black/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPlaylistId}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-white/5 [data-theme='light']:disabled:bg-black/5 disabled:cursor-not-allowed text-white rounded-md transition-colors border border-purple-500/30 disabled:border-white/10 [data-theme='light']:disabled:border-black/10"
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
      // Spotify embed with dark theme
      return `https://open.spotify.com/embed/track/${song.external_id}?utm_source=generator&theme=0`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) return null;

  const isSpotify = song.platform === 'spotify';
  const isYouTube = song.platform === 'youtube';

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 z-50 glass-card sm:rounded-lg shadow-2xl border-t sm:border border-white/20 [data-theme='light']:border-black/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 w-full sm:w-[360px] md:w-[400px]">
      {/* Header with song info */}
      <div className="flex items-center justify-between bg-white/5 [data-theme='light']:bg-black/5 px-3 sm:px-4 py-2 border-b border-white/10 [data-theme='light']:border-black/10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <img
            src={song.thumbnail_url}
            alt={song.title}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[var(--foreground)] font-semibold text-xs sm:text-sm truncate">{song.title}</p>
            <p className="text-[var(--muted-foreground)] text-[10px] sm:text-xs truncate">{song.artist}</p>
          </div>
          {isSpotify && (
            <span className="hidden sm:inline-block ml-2 px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30 whitespace-nowrap flex-shrink-0">
              Click ▶
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1.5 sm:p-1 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 active:bg-white/10 [data-theme='light']:active:bg-black/10 rounded transition-colors flex-shrink-0 border border-transparent hover:border-white/10 [data-theme='light']:hover:border-black/10"
        >
          <svg className="w-5 h-5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Player embed */}
      {isYouTube ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embedUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <iframe
          src={embedUrl}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full"
          style={{ height: '152px', borderRadius: 0 }}
        />
      )}
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
