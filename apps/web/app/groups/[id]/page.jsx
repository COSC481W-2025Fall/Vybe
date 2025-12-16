'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Heart, Plus, Trash2, X, Sparkles, Loader2, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ExportPlaylistButton from '@/components/ExportPlaylistButton';
import ExportToSpotifyButton from '@/components/ExportToSpotifyButton';
import { useRealtimeGroup } from '@/lib/realtime/useRealtimeGroup';
import { ConnectionDot } from '@/components/shared/ConnectionStatus';
import { useProgressTasks, useMiniplayer } from '@/lib/context/GlobalStateContext';

export default function GroupDetailPage({ params }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  
  // Global state hooks
  const { activeTasks, startTask, updateTaskProgress, completeTask, TASK_TYPES } = useProgressTasks();
  const { currentlyPlaying, playSong } = useMiniplayer();
  
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
  const [hasYouTube, setHasYouTube] = useState(false);
  const [hasSpotify, setHasSpotify] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [metadataStats, setMetadataStats] = useState(null);
  const sortStartTimeRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [joinCodeCopied, setJoinCodeCopied] = useState(false);
  
  // Check if sorting is in progress (from global state)
  const sortTaskId = group?.id ? `sort-${group.id}` : null;
  const sortTask = activeTasks.find(t => t.id === sortTaskId);
  const isSorting = sortTask?.status === 'running';
  const sortProgress = sortTask?.progress || 0;
  const sortEstimatedTime = sortTask?.estimatedTime;

  // Real-time update handlers (memoized to prevent re-subscriptions)
  const handleGroupUpdate = useCallback((newData, oldData) => {
    console.log('[Realtime] Group updated:', newData);
    setGroup(prev => ({ ...prev, ...newData }));
    
    // If sort order changed (by another user), notify and songs will re-sort via their own realtime updates
    if (newData.all_songs_sort_order && 
        JSON.stringify(oldData?.all_songs_sort_order) !== JSON.stringify(newData.all_songs_sort_order)) {
      console.log('[Realtime] Sort order changed by another member');
      toast.info('Playlist order was updated by another member');
    }
  }, []);

  const handlePlaylistChange = useCallback((eventType, newData, oldData) => {
    console.log('[Realtime] Playlist change:', eventType, newData);
    
    if (eventType === 'INSERT') {
      setPlaylists(prev => [...prev, newData]);
      toast.info(`New playlist added: ${newData.name}`);
    } else if (eventType === 'DELETE') {
      setPlaylists(prev => prev.filter(p => p.id !== oldData.id));
      toast.info('A playlist was removed');
    } else if (eventType === 'UPDATE') {
      setPlaylists(prev => prev.map(p => p.id === newData.id ? { ...p, ...newData } : p));
    }
  }, []);

  // Debounced sort for handling rapid display_order updates (prevents race conditions)
  const sortTimeoutRef = useRef(null);
  const needsSortRef = useRef(false);
  
  const debouncedSort = useCallback(() => {
    // Clear any pending sort
    if (sortTimeoutRef.current) {
      clearTimeout(sortTimeoutRef.current);
    }
    
    // Mark that we need to sort
    needsSortRef.current = true;
    
    // Schedule sort after updates settle (100ms debounce)
    sortTimeoutRef.current = setTimeout(() => {
      if (needsSortRef.current) {
        setPlaylistSongs(prev => 
          [...prev].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        );
        needsSortRef.current = false;
        console.log('[Realtime] Debounced sort completed');
      }
    }, 100);
  }, []);

  const handleSongChange = useCallback((eventType, newData, oldData) => {
    console.log('[Realtime] Song change:', eventType, newData);
    
    // Check if this song belongs to one of our playlists
    const relevantPlaylistIds = playlists.map(p => p.id);
    const playlistId = newData?.playlist_id || oldData?.playlist_id;
    
    if (!relevantPlaylistIds.includes(playlistId)) return;
    
    if (eventType === 'INSERT') {
      setPlaylistSongs(prev => [...prev, newData]);
      // Update track count
      setActualTrackCounts(prev => ({
        ...prev,
        [playlistId]: (prev[playlistId] || 0) + 1
      }));
    } else if (eventType === 'DELETE') {
      setPlaylistSongs(prev => prev.filter(s => s.id !== oldData.id));
      setActualTrackCounts(prev => ({
        ...prev,
        [playlistId]: Math.max(0, (prev[playlistId] || 1) - 1)
      }));
    } else if (eventType === 'UPDATE') {
      // Check if display_order changed (indicates AI sort happened)
      const displayOrderChanged = oldData?.display_order !== newData?.display_order;
      
      // Update the song data immediately
      setPlaylistSongs(prev => prev.map(s => s.id === newData.id ? { ...s, ...newData } : s));
      
      // If display_order changed, schedule a debounced re-sort
      // This batches multiple rapid updates into a single sort operation
      if (displayOrderChanged) {
        debouncedSort();
      }
    }
  }, [playlists, debouncedSort]);

  const handleMemberChange = useCallback((eventType, newData, oldData) => {
    console.log('[Realtime] Member change:', eventType, newData);
    
    if (eventType === 'INSERT') {
      // Guard against missing user_id
      if (!newData?.user_id) {
        console.warn('[Realtime] Member INSERT missing user_id');
        return;
      }
      // Fetch the new member's user info
      supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .eq('id', newData.user_id)
        .single()
        .then(({ data: userData }) => {
          if (userData) {
            setMembers(prev => [...prev, { ...newData, user: userData }]);
            toast.info(`${userData.username || 'Someone'} joined the group`);
          }
        });
    } else if (eventType === 'DELETE') {
      if (!oldData?.user_id) return;
      setMembers(prev => prev.filter(m => m.user_id !== oldData.user_id));
    }
  }, [supabase]);

  // Subscribe to real-time updates for this group
  // Use group.id (actual UUID) not groupId (could be slug from URL)
  const { isConnected: realtimeConnected } = useRealtimeGroup(group?.id, {
    onGroupUpdate: handleGroupUpdate,
    onPlaylistChange: handlePlaylistChange,
    onSongChange: handleSongChange,
    onMemberChange: handleMemberChange,
  });

  // Copy join code to clipboard
  const handleCopyJoinCode = async () => {
    if (!group?.join_code) return;
    try {
      await navigator.clipboard.writeText(group.join_code);
      setJoinCodeCopied(true);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setJoinCodeCopied(false), 2000);
    } catch (err) {
      toast.error("Couldn't copy. Please try selecting and copying manually.");
    }
  };

  useEffect(() => {
    // Unwrap params Promise
    Promise.resolve(params).then((resolvedParams) => {
      setGroupId(resolvedParams.id); // Can be UUID or slug
    });
  }, [params]);

  // Watch for import task completion and refresh data (backup mechanism)
  const lastCompletedImportRef = useRef(null);
  useEffect(() => {
    const importTask = activeTasks.find(t => 
      t.type === TASK_TYPES.IMPORT && 
      t.status === 'completed' &&
      t.id !== lastCompletedImportRef.current
    );
    
    if (importTask && group?.id) {
      console.log('[Groups] Import task completed, triggering refresh');
      lastCompletedImportRef.current = importTask.id;
      // Small delay to let the modal's onSuccess run first
      setTimeout(() => {
        loadGroupData().then(() => loadPlaylistSongs(selectedPlaylist));
      }, 500);
    }
  }, [activeTasks, group?.id, selectedPlaylist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to check if string is a UUID
  const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

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

  // Get estimated time based on song count and historical data
  // Now much faster with local heuristic sorting!
  const getEstimatedSortTime = (songCount) => {
    // Base: ~100ms per song for local heuristic + optional AI verification
    // Minimum 3 seconds, maximum 15 seconds (AI verification adds ~5-10s if enabled)
    const baseTimePerSong = 100; // 100ms per song (local heuristic is fast!)
    const aiVerificationTime = 8000; // AI verification adds ~8 seconds
    const baseTime = Math.min(15000, Math.max(3000, songCount * baseTimePerSong + aiVerificationTime));
    
    // Check localStorage for historical average
    try {
      const stats = JSON.parse(localStorage.getItem('smartSortStats') || '{}');
      if (stats.avgTimePerSong && stats.sampleCount >= 2) {
        // Use historical average if we have enough samples
        return Math.max(3000, Math.min(20000, songCount * stats.avgTimePerSong));
      }
    } catch (e) {
      console.warn('Could not read sort stats:', e);
    }
    
    return baseTime;
  };

  // Save sort timing to improve future estimates
  const saveSortTiming = (songCount, duration) => {
    try {
      const stats = JSON.parse(localStorage.getItem('smartSortStats') || '{}');
      const timePerSong = duration / Math.max(1, songCount);
      
      if (stats.avgTimePerSong && stats.sampleCount) {
        // Rolling average
        stats.avgTimePerSong = (stats.avgTimePerSong * stats.sampleCount + timePerSong) / (stats.sampleCount + 1);
        stats.sampleCount += 1;
      } else {
        stats.avgTimePerSong = timePerSong;
        stats.sampleCount = 1;
      }
      
      localStorage.setItem('smartSortStats', JSON.stringify(stats));
    } catch (e) {
      console.warn('Could not save sort stats:', e);
    }
  };

  // Start progress animation using global state
  const startProgressAnimation = (estimatedMs, taskId) => {
    sortStartTimeRef.current = Date.now();
    const estimatedSec = Math.ceil(estimatedMs / 1000);
    
    // Start global task
    startTask(taskId, TASK_TYPES.SORT, 'AI Sorting Playlist', group?.name);
    updateTaskProgress(taskId, 0, 'Analyzing songs...', estimatedSec);
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Update progress every 100ms
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - sortStartTimeRef.current;
      // Use easing function for smoother progress - never quite reaches 100%
      const rawProgress = elapsed / estimatedMs;
      const easedProgress = Math.min(0.95, 1 - Math.exp(-3 * rawProgress)); // Asymptotic approach
      const progress = Math.round(easedProgress * 100);
      
      // Update remaining time
      const remainingMs = Math.max(0, estimatedMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);
      
      const message = progress < 50 ? 'Analyzing songs...' : progress < 90 ? 'Optimizing order...' : 'Finishing up...';
      updateTaskProgress(taskId, progress, message, remainingSec);
    }, 100);
  };

  // Stop progress animation
  const stopProgressAnimation = (taskId, success = true, message = null) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    completeTask(taskId, success, message);
  };

  async function handleSmartSort(useQuickSort = false) {
    if (!groupId || !group?.id || isSorting) return;
    
    const taskId = `sort-${group.id}`;
    const mode = selectedPlaylist === 'all' ? 'all' : 'playlist';
    const skipQueue = useQuickSort; // If quick sort, skip the AI queue for instant results
    
    // Count songs for estimation
    const songCount = playlistSongs.length || 20; // Default to 20 if unknown
    const estimatedTime = skipQueue ? 3000 : getEstimatedSortTime(songCount);
    
    console.log(`[Groups] 🎵 Starting smart sort - Mode: ${mode}, Songs: ${songCount}, Est: ${estimatedTime}ms, QuickSort: ${skipQueue}`);
    
    // Start progress animation
    startProgressAnimation(estimatedTime, taskId);
    
    try {
      console.log(`[Groups] 📡 Calling API: /api/groups/${groupId}/smart-sort`);
      console.log(`[Groups] 📤 Request body:`, { mode, skipQueue });
      
      const response = await fetch(`/api/groups/${groupId}/smart-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, skipQueue }),
      });
      
      console.log(`[Groups] 📥 Response status:`, response.status, response.statusText);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[Groups] ❌ Non-JSON response received');
        throw new Error('Server error occurred. Please try again later.');
      }
      
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
        const errorMessage = data.error || "Couldn't sort your playlist. Please try again.";
        
        // Check for specific error types
        if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
          throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and plan settings to enable smart sorting.');
        } else if (errorMessage.includes('rate limit')) {
          throw new Error('Rate limit reached. Please wait a moment and try again.');
        } else {
          throw new Error(errorMessage);
        }
      }
      
      // Save timing for future estimates
      const sortDuration = Date.now() - sortStartTimeRef.current;
      saveSortTiming(data.songsProcessed || songCount, sortDuration);
      
      const successMessage = mode === 'all'
        ? `Vibe mix created with ${data.songsProcessed || 0} songs!`
        : `Successfully sorted ${data.songsProcessed || 0} songs!`;
      
      // Complete progress bar
      stopProgressAnimation(taskId, true, successMessage);
      toast.success(successMessage, { duration: 5000 });
      
      console.log(`[Groups] ✅ API call successful in ${sortDuration}ms, reloading data...`);
      
      // CRITICAL: Verify the database was updated before reloading
      // This helps catch if the API saved but we're not reading it
      // Use group.id (actual UUID) not groupId (could be slug from URL)
      const actualGroupId = group?.id;
      if (!actualGroupId) {
        console.warn('[Groups] ⚠️  Cannot verify - group not loaded yet');
      }
      const { data: verifyGroup } = actualGroupId ? await supabase
        .from('groups')
        .select('all_songs_sort_order, all_songs_sorted_at')
        .eq('id', actualGroupId)
        .single() : { data: null };
      
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
          toast.error("Something went wrong while saving. Please try sorting again.", { duration: 7000 });
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
      // Show user-friendly error message
      const userMessage = error.message?.includes('rate') || error.message?.includes('limit')
        ? "You've sorted a few times recently. Please wait a moment."
        : error.message?.includes('queue') || error.message?.includes('busy')
        ? "We're a bit busy right now. Please try the Quick sort option!"
        : error.message?.includes('playlist') || error.message?.includes('access')
        ? "Add a playlist to this group to use AI Sort."
        : "Couldn't sort your playlist. Please try again.";
      stopProgressAnimation(taskId, false, userMessage);
      toast.error(userMessage, { duration: 7000 });
    }
  }

  // Cleanup intervals/timeouts on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }
    };
  }, []);

  async function loadGroupData() {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !groupId) return;

    // First, fetch the group - try slug first, then UUID as fallback
    // This handles edge cases where slugs might look like UUIDs
    let groupData = null;
    let groupError = null;
    
    // Try slug first
    const { data: bySlug } = await supabase
      .from('groups')
      .select('*')
      .eq('slug', groupId)
      .maybeSingle();
    
    if (bySlug) {
      groupData = bySlug;
    } else if (isUUID(groupId)) {
      // Fallback to UUID lookup
      const { data: byId, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      groupData = byId;
      groupError = error;
    }

    if (groupError || !groupData) {
      console.error('[Groups] Error loading group:', groupError);
      router.push('/groups');
      return;
    }

    // Use the actual group ID for subsequent queries
    const actualGroupId = groupData.id;

    // Fetch members and playlists in parallel using actual ID
    const [memberResult, playlistResult] = await Promise.all([
      supabase
        .from('group_members')
        .select('user_id, joined_at')
        .eq('group_id', actualGroupId),
      supabase
        .from('group_playlists')
        .select('*')
        .eq('group_id', actualGroupId)
        .order('smart_sorted_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true })
    ]);

    const { data: memberData } = memberResult;
    const { data: playlistData } = playlistResult;

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
    const memberUserIds = (memberData || []).map(m => m.user_id).filter(Boolean);
    const userFetchPromises = [];
    
    // Only fetch owner if owner_id exists
    if (groupData.owner_id) {
      userFetchPromises.push(
        supabase
          .from('users')
          .select('id, username, display_name, profile_picture_url')
          .eq('id', groupData.owner_id)
          .maybeSingle()
      );
    } else {
      userFetchPromises.push(Promise.resolve({ data: null, error: null }));
    }

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

    // Fetch metadata stats for sort quality indicator (non-blocking)
    fetchMetadataStats(groupData.id);

    setLoading(false);
  }

  // Fetch metadata stats to show sort quality warning
  async function fetchMetadataStats(actualGroupId) {
    try {
      const response = await fetch(`/api/groups/${actualGroupId}/smart-sort`);
      if (response.ok) {
        const data = await response.json();
        if (data.metadataStats) {
          setMetadataStats(data.metadataStats);
        }
      }
    } catch (error) {
      console.warn('[Groups] Failed to fetch metadata stats:', error);
    }
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
      // Use group.id (actual UUID) not groupId (could be slug from URL)
      let currentGroup = group;
      const groupUUID = group?.id;
      const { data: freshGroupData } = groupUUID ? await supabase
        .from('groups')
        .select('all_songs_sort_order, all_songs_sorted_at')
        .eq('id', groupUUID)
        .single() : { data: null };
      
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

    // Get cached likes from localStorage as backup
    const cachedLikes = (() => {
      try {
        const cached = localStorage.getItem(`vybe_liked_songs_${session.user.id}`);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    })();

    // Transform songs to include liked status and playlist info
    // Uses database likes primarily, falls back to localStorage cache
    const songsWithLikes = (songs || []).map(song => {
      const dbLiked = song.song_likes?.some(like => like.user_id === session.user.id) || false;
      const cacheLiked = cachedLikes.includes(song.id);
      
      // Prefer database value, but use cache if DB has no likes data
      const isLiked = dbLiked || (song.song_likes === null && cacheLiked);
      
      return {
        ...song,
        isLiked,
        likeCount: song.song_likes?.length || 0,
        playlistName: song.group_playlists?.name || 'Unknown',
        platform: song.group_playlists?.platform || 'unknown',
      };
    });

    setPlaylistSongs(songsWithLikes);
  }

  async function handleResetSort() {
    if (!groupId || isResetting) return;
    
    setIsResetting(true);
    
    try {
      const response = await fetch(`/api/groups/${groupId}/reset-sort`, {
        method: 'POST',
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error occurred. Please try again later.');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Couldn't reset the sort order.");
      }
      
      toast.success('Sort order reset to default');
      
      // Reload to show original order
      await loadGroupData();
      await loadPlaylistSongs('all');
    } catch (error) {
      console.error('[Groups] Error resetting sort:', error);
      toast.error("Couldn't reset the sort order. Please try again.", { duration: 5000 });
    } finally {
      setIsResetting(false);
    }
  }

  // Helper to get/set likes from localStorage cache
  function getLikedSongsCache(userId) {
    try {
      const cached = localStorage.getItem(`vybe_liked_songs_${userId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  function setLikedSongsCache(userId, likedSongIds) {
    try {
      localStorage.setItem(`vybe_liked_songs_${userId}`, JSON.stringify(likedSongIds));
    } catch (e) {
      console.warn('[Groups] Could not save likes to localStorage:', e);
    }
  }

  async function toggleLikeSong(songId, isCurrentlyLiked) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You need to be logged in to like songs");
      return false;
    }

    const userId = session.user.id;
    console.log(`[Groups] Toggling like for song ${songId}, currently liked: ${isCurrentlyLiked}`);

    try {
      if (isCurrentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from('song_likes')
          .delete()
          .eq('song_id', songId)
          .eq('user_id', userId);
        
        if (error) {
          console.error('[Groups] Unlike error:', error);
          throw error;
        }
        console.log(`[Groups] Successfully unliked song ${songId}`);

        // Update localStorage cache
        const cachedLikes = getLikedSongsCache(userId);
        setLikedSongsCache(userId, cachedLikes.filter(id => id !== songId));
      } else {
        // Like
        const { data, error } = await supabase
          .from('song_likes')
          .insert({
            song_id: songId,
            user_id: userId,
          })
          .select();
        
        if (error) {
          console.error('[Groups] Like error:', error);
          throw error;
        }
        console.log(`[Groups] Successfully liked song ${songId}, inserted:`, data);

        // Update localStorage cache
        const cachedLikes = getLikedSongsCache(userId);
        if (!cachedLikes.includes(songId)) {
          setLikedSongsCache(userId, [...cachedLikes, songId]);
        }
      }

      // Verify the change by querying the database
      const { data: verifyData, error: verifyError } = await supabase
        .from('song_likes')
        .select('*')
        .eq('song_id', songId)
        .eq('user_id', userId);
      
      if (verifyError) {
        console.warn('[Groups] Could not verify like status:', verifyError);
      } else {
        const nowLiked = verifyData && verifyData.length > 0;
        console.log(`[Groups] Verified: song ${songId} is now ${nowLiked ? 'liked' : 'not liked'} (expected: ${!isCurrentlyLiked})`);
        
        if (nowLiked !== !isCurrentlyLiked) {
          console.error('[Groups] Like status mismatch! Database may not have updated correctly.');
        }
      }

      // Reload songs to update like status
      loadPlaylistSongs(selectedPlaylist);
      return true;
    } catch (error) {
      console.error('[Groups] Error toggling like:', error);
      toast.error("Couldn't save your like. Please try again.");
      // Reload to reset the UI to the actual state
      loadPlaylistSongs(selectedPlaylist);
      return false;
    }
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
          {/* Desktop: Side by side | Mobile: Stacked */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Group Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="page-title mb-1 text-xl sm:text-2xl truncate">{group?.name}</h1>
                <ConnectionDot className="mt-0.5 flex-shrink-0" />
              </div>
              <p className="section-subtitle text-xs sm:text-sm line-clamp-2">{group?.description || 'No description'}</p>
              {/* Join Code - Click to copy */}
              {group?.join_code && (
                <button
                  onClick={handleCopyJoinCode}
                  className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] border border-[var(--glass-border)] transition-colors group"
                  title="Click to copy join code"
                  aria-label={`Join code: ${group.join_code}. Click to copy.`}
                >
                  <span className="text-xs text-[var(--muted-foreground)]">Join:</span>
                  <span className="font-mono font-bold text-sm text-[var(--foreground)] tracking-wider">{group.join_code}</span>
                  {joinCodeCopied ? (
                    <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
            
            {/* Action Buttons - Full width on mobile */}
            <div className="flex items-center gap-2 sm:gap-3 sm:flex-shrink-0">
              {group?.owner_id === user?.id && (
                <button
                  onClick={() => setShowDeleteGroupModal(true)}
                  className="flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/30 text-red-400 rounded-xl font-medium transition-colors text-sm border border-red-600/30"
                  title="Delete Group"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                onClick={() => setShowAddPlaylistModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 active:bg-gray-200 text-black rounded-xl font-medium transition-colors text-sm shadow-sm"
              >
                <Plus className="h-5 w-5" />
                <span>Add Playlist</span>
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
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
              {/* Playlist Selector */}
              {playlists.length > 0 ? (
                <>
                  {/* Smart Sort Section - Mobile optimized */}
                  <div className="mb-4 space-y-3">
                    {/* Sort Status Badge */}
                    {selectedPlaylist === 'all' && group?.all_songs_sort_order && group.all_songs_sort_order.length > 0 && (
                      <div className="sort-badge p-3 rounded-xl border flex items-center gap-3">
                        <div className="sort-badge-icon p-2 rounded-lg">
                          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--accent)]">Vibe Mix Active</p>
                          {group.all_songs_sorted_at && (
                            <p className="text-xs text-[var(--muted-foreground)] ">
                              Sorted {new Date(group.all_songs_sorted_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedPlaylist !== 'all' && playlists.some(p => p.smart_sorted_order !== null) && (
                      <div className="sort-badge p-3 rounded-xl border flex items-center gap-3">
                        <div className="sort-badge-icon p-2 rounded-lg">
                          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--accent)]">AI Smart Sort Active</p>
                          {playlists[0]?.last_sorted_at && (
                            <p className="text-xs text-[var(--muted-foreground)] ">
                              Sorted {new Date(playlists[0].last_sorted_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Sort Action Buttons - Grid on mobile */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Reset Order button - only show for "All" view when unified sort exists */}
                      {selectedPlaylist === 'all' && group?.all_songs_sort_order && group.all_songs_sort_order.length > 0 && (
                        <button
                          onClick={handleResetSort}
                          disabled={isResetting}
                          className="px-3 py-2 text-sm rounded-xl border border-[var(--glass-border)] hover:bg-[var(--secondary-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[var(--muted-foreground)]"
                        >
                          {isResetting ? 'Resetting...' : 'Reset'}
                        </button>
                      )}
                      
                      {/* Quick Sort - instant, local algorithm */}
                      <button
                        onClick={() => handleSmartSort(true)}
                        disabled={isSorting || playlists.length === 0}
                        title="Instant sort using local algorithm - no wait time"
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
                      >
                        <Sparkles className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">Quick</span>
                      </button>
                      
                      {/* AI Smart Sort - queued, AI-enhanced */}
                      <button
                        onClick={() => handleSmartSort(false)}
                        disabled={isSorting || playlists.length === 0}
                        title={selectedPlaylist === 'all' ? 'AI-enhanced sort with perfect transitions (may queue during high traffic)' : 'Sorts this playlist by AI recommendation'}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-pink-600 hover:opacity-90 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-sm"
                      >
                        {isSorting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Sorting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span className="text-sm">AI Sort</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Metadata Quality Warning */}
                    {metadataStats && metadataStats.total > 0 && metadataStats.percentage < 50 && (
                      <div className="metadata-warning mt-3 p-2.5 rounded-lg border flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-400 [data-theme='light']:text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-[var(--muted-foreground)] [data-theme='light']:text-amber-800">
                          <span className="text-amber-400 [data-theme='light']:text-amber-700 font-medium">
                            {metadataStats.percentage}% of songs have metadata
                          </span>
                          <span className="block mt-0.5 text-[var(--muted-foreground)] [data-theme='light']:text-amber-700/80">
                            Sort quality improves as more songs get genre/popularity data. Re-sorting will fetch missing metadata.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar for Smart Sorting */}
                  {isSorting && (
                    <div className="mb-4 p-4 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[var(--accent)] animate-pulse" />
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {sortProgress < 50 ? 'Analyzing songs...' : sortProgress < 90 ? 'Optimizing order...' : 'Finishing up...'}
                          </span>
                        </div>
                        <span className="text-sm text-[var(--muted-foreground)]">
                          {sortProgress}%
                          {sortEstimatedTime !== null && sortEstimatedTime > 0 && (
                            <span className="ml-2">
                              (~{sortEstimatedTime}s)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--secondary-bg)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[var(--accent)] to-pink-500 rounded-full transition-all duration-200 ease-out"
                          style={{ width: `${sortProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {playlistSongs.length} songs • No consecutive same artist/genre
                        </p>
                        <span className="text-xs text-[var(--accent)]">
                          Fast local + AI verification
                        </span>
                      </div>
                    </div>
                  )}
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
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="section-title">
                            {selectedPlaylist === 'all' ? 'All Playlists' : playlists.find(p => p.id === selectedPlaylist)?.name}
                          </h2>
                          {/* Open Source Playlist Button - only when a specific playlist is selected */}
                          {selectedPlaylist !== 'all' && (() => {
                            const playlist = playlists.find(p => p.id === selectedPlaylist);
                            const playlistUrl = playlist?.playlist_url;
                            if (!playlistUrl) return null;
                            const isSpotify = playlist?.platform === 'spotify';
                            return (
                              <button
                                onClick={() => window.open(playlistUrl, '_blank', 'noopener,noreferrer')}
                                className={`p-1.5 rounded-lg transition-colors ${isSpotify ? 'hover:bg-green-500/20 active:bg-green-500/30' : 'hover:bg-red-500/20 active:bg-red-500/30'}`}
                                aria-label={`Open source playlist on ${isSpotify ? 'Spotify' : 'YouTube'}`}
                                title={`Open on ${isSpotify ? 'Spotify' : 'YouTube'}`}
                              >
                                <ExternalLink className={`h-4 w-4 ${isSpotify ? 'text-green-400' : 'text-red-400'}`} />
                              </button>
                            );
                          })()}
                        </div>
                        <p className="section-subtitle">
                          {playlistSongs.length} tracks • {formatDuration(playlistSongs.reduce((acc, song) => acc + (song.duration || 0), 0))}
                        </p>
                      </div>
                      {/* Export Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Export to Spotify Button - Only shown for Spotify-connected users */}
                        {hasSpotify && group?.id && (
                          <ExportToSpotifyButton
                            sourceType="group"
                            sourceId={group.id}
                            playlistId={selectedPlaylist}
                            groupId={selectedPlaylist === 'all' ? group.id : undefined}
                            defaultName={
                              selectedPlaylist === 'all'
                                ? group?.name || 'Group Playlist'
                                : playlists.find(p => p.id === selectedPlaylist)?.name || 'Playlist'
                            }
                          />
                        )}
                        {/* Export to YouTube Button - Only shown for YouTube-connected users */}
                        {hasYouTube && group?.id && (
                          <ExportPlaylistButton
                            sourceType="group"
                            sourceId={group.id}
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
                          onPlay={(song) => playSong(song, playlistSongs, index)}
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
        <div className="mt-4 sm:mt-6">
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="relative flex flex-col items-center p-3 sm:p-4 bg-white/5 [data-theme='light']:bg-black/5 rounded-xl border border-white/10 [data-theme='light']:border-black/10 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 transition-colors"
                >
                  {/* Remove button - absolute positioned */}
                  {group?.owner_id === user?.id && !member.isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToRemove(member);
                        setShowRemoveMemberModal(true);
                      }}
                      className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove member"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  
                  {/* Clickable profile link */}
                  <button
                    onClick={() => member.users?.username && router.push(`/u/${member.users.username}`)}
                    disabled={!member.users?.username}
                    className="flex flex-col items-center w-full hover:opacity-80 transition-opacity disabled:cursor-default disabled:opacity-100"
                  >
                    {member.users?.profile_picture_url ? (
                      <img
                        src={member.users.profile_picture_url}
                        alt={member.users?.display_name || member.users?.username || 'User'}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover mb-2"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold mb-2">
                        {(member.users?.display_name || member.users?.username)?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <p className="font-medium text-[var(--foreground)] text-sm text-center truncate w-full">
                      {member.users?.display_name || member.users?.username || 'Unknown'}
                    </p>
                    {member.users?.username && (
                      <p className="text-xs text-[var(--muted-foreground)] truncate w-full text-center">@{member.users.username}</p>
                    )}
                  </button>
                  
                  {/* Owner badge */}
                  {member.isOwner && (
                    <span className="mt-2 text-xs px-2 py-0.5 bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] rounded border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
                      Owner
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && memberToRemove && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="remove-member-title"
          aria-describedby="remove-member-description"
        >
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full border border-[var(--glass-border)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                <X className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <h3 id="remove-member-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                Remove Member?
              </h3>
            </div>
            
            <p id="remove-member-description" className="text-sm sm:text-base text-[var(--muted-foreground)] mb-6">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {memberToRemove.users?.display_name || memberToRemove.users?.username || 'this member'}
              </span>{' '}
              from the group? They'll need to rejoin using the group code.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setMemberToRemove(null);
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove)}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-group-title"
          aria-describedby="delete-group-description"
        >
          <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full border border-[var(--glass-border)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                <Trash2 className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <h3 id="delete-group-title" className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                Delete Group?
              </h3>
            </div>
            
            <p id="delete-group-description" className="text-sm sm:text-base text-[var(--muted-foreground)] mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[var(--foreground)]">{group?.name}</span>?
              This action cannot be undone and will remove all playlists and members.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteGroupModal(false)}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Playlist Modal */}
      {showAddPlaylistModal && group?.id && (
        <AddPlaylistModal
          groupId={group.id}
          onClose={() => setShowAddPlaylistModal(false)}
          onSuccess={() => {
            setShowAddPlaylistModal(false);
            // Force full reload to pick up new playlist and its songs
            // (realtime can miss songs for newly created playlists)
            console.log('[Groups] Import success - reloading all data');
            loadGroupData().then(() => {
              // Also reload songs to ensure we have the latest
              loadPlaylistSongs(selectedPlaylist);
            });
          }}
        />
      )}

      {/* Embedded Player is now global - see GlobalMiniplayer component */}
    </div>
  );
}

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

function SongItem({ song, index, onToggleLike, userId, onPlay, isPlaying }) {
  const [isLiked, setIsLiked] = useState(song.isLiked || false);

  // Sync local state with prop when it changes (e.g., after server refresh)
  useEffect(() => {
    setIsLiked(song.isLiked || false);
  }, [song.isLiked]);

  const handleLikeClick = async (e) => {
    e.stopPropagation(); // Prevent opening player when clicking like button
    const previousState = isLiked;
    setIsLiked(!isLiked); // Optimistic update
    const success = await onToggleLike(song.id, previousState);
    if (!success) {
      setIsLiked(previousState); // Revert on failure
    }
  };

  const handleSongClick = () => {
    onPlay(song);
  };

  // Use parsed/cleaned title and artist if available (especially for YouTube songs)
  const displayTitle = song.parsed_title || song.title || 'Untitled';
  const displayArtist = song.parsed_artist || song.artist || 'Unknown Artist';

  // Build external URLs (with autoplay)
  const getSpotifyUrl = () => {
    // Direct Spotify URL if available
    if (song.spotify_url) {
      const url = song.spotify_url.includes('?') 
        ? `${song.spotify_url}&autoplay=true` 
        : `${song.spotify_url}?autoplay=true`;
      return url;
    }
    if (song.platform === 'spotify' && song.external_id) {
      return `https://open.spotify.com/track/${song.external_id}?autoplay=true`;
    }
    // For YouTube songs, create a Spotify search URL using cleaned title/artist
    if (song.platform === 'youtube') {
      const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
      return `https://open.spotify.com/search/${searchQuery}`;
    }
    return null;
  };

  const getYouTubeUrl = () => {
    // Direct YouTube URL if available
    if (song.youtube_url) {
      const url = song.youtube_url.includes('?') 
        ? `${song.youtube_url}&autoplay=1` 
        : `${song.youtube_url}?autoplay=1`;
      return url;
    }
    if (song.platform === 'youtube' && song.external_id) {
      return `https://www.youtube.com/watch?v=${song.external_id}&autoplay=1`;
    }
    // For Spotify songs, create a YouTube search URL
    if (song.platform === 'spotify') {
      const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
      return `https://www.youtube.com/results?search_query=${searchQuery}`;
    }
    return null;
  };

  const spotifyUrl = getSpotifyUrl();
  const youtubeUrl = getYouTubeUrl();
  
  // Determine if URLs are direct links or search links
  const isSpotifyDirect = song.spotify_url || song.platform === 'spotify';
  const isYouTubeDirect = song.youtube_url || song.platform === 'youtube';

  const handleExternalLinkClick = (e, url) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
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
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[var(--accent)] to-pink-500 rounded flex-shrink-0 overflow-hidden">
        {song.thumbnail_url ? (
          <img src={song.thumbnail_url} alt={displayTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--foreground)] text-xs">
            {displayTitle?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Song Info - Takes priority and available space */}
      <div className="flex-1 min-w-0 pr-2 sm:pr-0">
        <p className="font-semibold text-[var(--foreground)] truncate text-sm sm:text-base">{displayTitle}</p>
        <p className="text-sm text-[var(--muted-foreground)] truncate">{displayArtist}</p>
      </div>

      {/* Platform Buttons - Both Spotify and YouTube */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {spotifyUrl && (
          <button
            onClick={(e) => handleExternalLinkClick(e, spotifyUrl)}
            className={`p-1.5 rounded-lg transition-colors ${
              isSpotifyDirect 
                ? 'hover:bg-green-500/20 active:bg-green-500/30' 
                : 'hover:bg-green-500/10 active:bg-green-500/20 opacity-60 hover:opacity-100'
            }`}
            aria-label={isSpotifyDirect ? `Open ${displayTitle} in Spotify` : `Search ${displayTitle} on Spotify`}
            title={isSpotifyDirect ? 'Open in Spotify' : 'Search on Spotify'}
          >
            <SpotifyIcon className="h-4 w-4 text-green-500" aria-hidden="true" />
          </button>
        )}
        {youtubeUrl && (
          <button
            onClick={(e) => handleExternalLinkClick(e, youtubeUrl)}
            className={`p-1.5 rounded-lg transition-colors ${
              isYouTubeDirect 
                ? 'hover:bg-red-500/20 active:bg-red-500/30' 
                : 'hover:bg-red-500/10 active:bg-red-500/20 opacity-60 hover:opacity-100'
            }`}
            aria-label={isYouTubeDirect ? `Open ${displayTitle} in YouTube` : `Search ${displayTitle} on YouTube`}
            title={isYouTubeDirect ? 'Open in YouTube' : 'Search on YouTube'}
          >
            <YouTubeIcon className="h-4 w-4 text-red-500" aria-hidden="true" />
          </button>
        )}
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
  const { startTask, updateTaskProgress, completeTask, TASK_TYPES } = useProgressTasks();
  
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
    // Run connected accounts check on mount
    checkConnectedAccounts();
  }, []);

  useEffect(() => {
    // Check user's existing playlist once we have the groupId
    if (groupId) {
      checkUserExistingPlaylist();
    }
  }, [groupId]);

  useEffect(() => {
    // Load playlists from all connected platforms
    if (hasSpotify || hasYoutube) {
      loadAllPlaylists();
    }
  }, [hasSpotify, hasYoutube]);

  async function checkUserExistingPlaylist() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !groupId) return;

    // Check if user already has a playlist in this group
    // groupId is now the actual UUID passed from the parent component
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
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Please sign in to add a playlist');
      return;
    }

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
      const playlistName = playlistPlatform === 'spotify' 
        ? selectedPlaylist.name 
        : selectedPlaylist.snippet?.title || 'Playlist';

      // Generate playlist URL based on platform
      let playlistUrl;
      if (playlistPlatform === 'spotify') {
        playlistUrl = selectedPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${selectedPlaylist.id}`;
      } else {
        playlistUrl = `https://www.youtube.com/playlist?list=${selectedPlaylist.id}`;
      }

      // Start global progress tracking
      const taskId = `import-${groupId}-${Date.now()}`;
      const isReplacing = !!userExistingPlaylist;
      startTask(taskId, TASK_TYPES.IMPORT, isReplacing ? 'Replacing Playlist' : 'Importing Playlist', playlistName);
      updateTaskProgress(taskId, 10, 'Fetching playlist data...', null);
      
      // Store callbacks before closing modal (they may become stale after unmount)
      const successCallback = onSuccess;
      
      // Close modal immediately - progress shows globally in GlobalProgressBar
      onClose();

      // Run the import in background (not awaited by component lifecycle)
      (async () => {
        try {
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

          updateTaskProgress(taskId, 50, 'Processing songs...', null);

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to import playlist');
          }

          // Complete the task successfully
          completeTask(taskId, true, `Imported ${data.songCount || 'all'} songs`);
          
          // Use setTimeout to ensure this runs after React processes state updates
          setTimeout(() => {
            try {
              successCallback();
            } catch (e) {
              console.warn('[Import] Success callback failed, data will refresh via realtime');
            }
          }, 100);
        } catch (importErr) {
          console.error('Error importing playlist:', importErr);
          // Complete with error using the SAME taskId
          completeTask(taskId, false, importErr.message || 'Failed to import');
          toast.error(importErr.message || 'Failed to import playlist');
        }
      })();
      
      // Return early - the IIFE handles the rest
      return;
    } catch (err) {
      console.error('Error preparing import:', err);
      setError(err.message || 'Failed to prepare import');
      setLoading(false);
    }
  }

  if (!hasSpotify && !hasYoutube) {
    return (
      <div className="fixed inset-0 bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="glass-card rounded-xl sm:rounded-2xl max-w-sm w-full p-4 sm:p-6 border border-[var(--glass-border)]">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[var(--foreground)]">No Accounts Connected</h2>
          <p className="text-sm sm:text-base text-[var(--muted-foreground)] mb-6">
            Please connect your Spotify or YouTube account in Settings to add playlists to this group.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
            >
              Close
            </button>
            <button
              onClick={() => window.location.href = '/settings'}
              className="flex-1 px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-xl font-medium transition-colors"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 border border-[var(--glass-border)]">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[var(--foreground)]">
          {userExistingPlaylist ? 'Replace Your Playlist' : 'Add Playlist'}
        </h2>

        {userExistingPlaylist && (
          <div className="mb-4 p-3 bg-amber-100 [data-theme='dark']:bg-amber-900/30 border border-amber-400 [data-theme='dark']:border-amber-500/50 rounded-lg text-amber-800 [data-theme='dark']:text-amber-300 text-sm">
            <p className="font-semibold mb-1">⚠️ You already have a playlist in this group</p>
            <p className="opacity-90">
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
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setPlatform(null)}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border ${
                    platform === null
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--secondary-bg)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] border-[var(--glass-border)]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('youtube')}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border ${
                    platform === 'youtube'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-[var(--secondary-bg)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] border-[var(--glass-border)]'
                  }`}
                >
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('spotify')}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border ${
                    platform === 'spotify'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-[var(--secondary-bg)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] border-[var(--glass-border)]'
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
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {hasYoutube && (
                  <button
                    type="button"
                    onClick={() => setPlatform('youtube')}
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border ${
                      platform === 'youtube'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-[var(--secondary-bg)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] border-[var(--glass-border)]'
                    }`}
                  >
                    YouTube
                  </button>
                )}
                {hasSpotify && (
                  <button
                    type="button"
                    onClick={() => setPlatform('spotify')}
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-colors border ${
                      platform === 'spotify'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-[var(--secondary-bg)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] border-[var(--glass-border)]'
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
              <div className="max-h-64 overflow-y-auto bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-xl modal-scroll">
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
                        className={`w-full flex items-center gap-3 p-3 hover:bg-[var(--secondary-hover)] transition-colors border-b border-[var(--glass-border)] last:border-b-0 ${
                          isSelected ? 'bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]' : ''
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
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              playlistPlatform === 'spotify' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-red-600 text-white'
                            }`}>
                              {playlistPlatform === 'spotify' ? 'Spotify' : 'YouTube'}
                            </span>
                          </div>
                          {trackCount !== null && trackCount !== undefined && (
                            <p className="text-sm text-[var(--muted-foreground)]">{trackCount} tracks</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
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
            <div className="mb-4 p-3 bg-red-100 [data-theme='dark']:bg-red-900/30 border border-red-300 [data-theme='dark']:border-red-500/50 rounded-lg text-red-700 [data-theme='dark']:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-xl font-medium transition-colors border border-[var(--glass-border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPlaylistId}
              className="flex-1 px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white disabled:text-gray-200 rounded-xl font-medium transition-colors"
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