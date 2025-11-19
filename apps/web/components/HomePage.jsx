'use client';

import { useState } from "react";
// imported supabase to support community playlists
import { supabaseBrowser } from '@/lib/supabase/client';
// imported lucide-react to support like button and play button
import { Users, Plus, TrendingUp, ChevronRight, Music, AlertCircle, Heart, Play } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { useGroups } from "../hooks/useGroups";
import { useSocial } from "../hooks/useSocial";
import { GroupCard } from "./shared/GroupCard";
import { LoadingState } from "./shared/LoadingState";
import { EmptyState } from "./shared/EmptyState";
import { TextField, TextareaField, SwitchField } from "./shared/FormField";
import { useDialog } from "../hooks/useDialog";
import { SongDetailsDialog } from "./shared/SongDetailsDialog";
import { CommunitiesDialog } from "./shared/CommunitiesDialog";
import { ShareSongDialog } from "./shared/ShareSongDialog";
import { toast } from "sonner";
/**
 * HomePage component - Main dashboard view for authenticated users
 * Displays groups, friends' songs, and music communities
 * @param {Object} props
 * @param {Function} props.onNavigate - Optional navigation handler for routing
 */
export function HomePage({ onNavigate } = {}) {
  const { groups, createGroup, loading: groupsLoading, error: groupsError } = useGroups();
  const { friendsSongsOfTheDay, communities, loading: socialLoading, error: socialError } = useSocial();
  const createGroupDialog = useDialog();
  const communitiesDialog = useDialog();
  const shareSongDialog = useDialog();
  // Added dialogue hook and state (delete this comment later)
  const communityDetailDialog = useDialog();
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [createError, setCreateError] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [songDialogOpen, setSongDialogOpen] = useState(false);

  // added to support community playlists
  const [communityPlaylists, setCommunityPlaylists] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState('');
  
  // added to show playlists on home page
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  // Map each community to a specific Spotify playlist name
  // **********************************************************
  // *******************EDIT PLAYLISTS HERE********************
  // **********************************************************

  const communityPlaylistMap = {
    'Indie Discoveries': 'Chill music', // Replace with your actual playlist name
    'Jazz Lounge': 'Music from hell', // Replace with your actual playlist name
    'Electronic Pulse': 'Gaming', // Replace with your actual playlist name
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      setCreateError("");
      await createGroup(groupName, groupDescription, !isPublic);
      createGroupDialog.close();
      setGroupName("");
      setGroupDescription("");
      setIsPublic(true);
    } catch (error) {
      setCreateError(error.message || "Failed to create group");
    }
  };

  // Loads Spotify playlists directly from Spotify API
  async function loadCommunityPlaylists({ playlistName } = {}) {
    try {
      setCommunityError('');
      setCommunityLoading(true);
      const supabase = supabaseBrowser();

      // ensure we have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCommunityPlaylists([]);
        setCommunityError('Not authenticated');
        return;
      }

      // Fetch user's Spotify playlists using the API route (handles auth automatically)
      const response = await fetch('/api/spotify/me/playlists?limit=50');

      if (!response.ok) {
        throw new Error('Failed to fetch Spotify playlists');
      }

      const data = await response.json();
      let playlists = data.items || [];

      // Filter by exact playlist name if provided
      if (playlistName?.trim()) {
        const searchName = playlistName.trim().toLowerCase();
        playlists = playlists.filter(p => 
          p.name.toLowerCase() === searchName || 
          p.name.toLowerCase().includes(searchName)
        );
      }

      // Transform to match expected format - show only the matching playlist (or first 3 if no filter)
      const formattedPlaylists = (playlistName?.trim() ? playlists : playlists.slice(0, 3)).map(p => ({
        id: p.id,
        name: p.name,
        platform: 'spotify',
        spotify_url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
        image: p.images?.[0]?.url,
        track_count: p.tracks?.total || 0
      }));

      console.log('[Home] Spotify playlists:', formattedPlaylists);
      setCommunityPlaylists(formattedPlaylists);
    } catch (e) {
      console.error('[Home] Spotify playlists error:', e);
      setCommunityError(e.message || 'Failed to load Spotify playlists');
    } finally {
      setCommunityLoading(false);
    }
  }

  // Loads songs from a Spotify playlist (fetches all songs using pagination)
  async function loadSpotifyPlaylistSongs(spotifyPlaylistId) {
    try {
      setLoadingSongs(true);
      setCommunityError('');
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCommunityError('Not authenticated');
        return;
      }

      if (!spotifyPlaylistId) {
        throw new Error('Playlist ID is required');
      }

      // Helper function to convert Spotify API URL to our proxy URL
      const convertToProxyUrl = (spotifyUrl) => {
        try {
          const url = new URL(spotifyUrl);
          // Extract path after /v1/ and query string
          // e.g., https://api.spotify.com/v1/playlists/{id}/tracks?offset=100
          // becomes /api/spotify/playlists/{id}/tracks?offset=100
          const pathMatch = url.pathname.match(/^\/v1\/(.+)$/);
          if (pathMatch) {
            return `/api/spotify/${pathMatch[1]}${url.search}`;
          }
          return null;
        } catch (e) {
          console.error('[Home] Error converting URL:', spotifyUrl, e);
          return null;
        }
      };

      // Fetch all tracks from Spotify playlist using pagination
      let allItems = [];
      let nextUrl = `/api/spotify/playlists/${spotifyPlaylistId}/tracks?limit=100`;
      
      while (nextUrl) {
        const response = await fetch(nextUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorData.error || errorMessage;
          } catch {
            // Not JSON, use text as-is
            errorMessage = errorText.substring(0, 200); // Limit error message length
          }
          throw new Error(`Failed to fetch Spotify playlist tracks: ${errorMessage}`);
        }

        const data = await response.json();
        const items = data.items || [];
        allItems = [...allItems, ...items];
        
        // Check if there are more pages
        if (data.next) {
          const convertedUrl = convertToProxyUrl(data.next);
          if (convertedUrl) {
            nextUrl = convertedUrl;
          } else {
            console.warn('[Home] Could not convert next URL, stopping pagination:', data.next);
            nextUrl = null;
          }
        } else {
          nextUrl = null;
        }
      }

      // Transform Spotify tracks to match our song format
      const songs = allItems
        .filter(item => item.track && item.track.id) // Filter out null tracks
        .map((item, index) => {
          const track = item.track;
          return {
            id: track.id,
            title: track.name,
            artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
            duration: Math.floor((track.duration_ms || 0) / 1000), // Convert ms to seconds
            thumbnail_url: track.album?.images?.[0]?.url,
            external_id: track.id,
            platform: 'spotify',
            position: index,
            isLiked: false, // Spotify API doesn't include like status in playlist tracks
            likeCount: 0,
          };
        });

      setPlaylistSongs(songs);
    } catch (e) {
      console.error('[Home] Error loading Spotify playlist songs:', e);
      setCommunityError(e.message || 'Failed to load playlist songs');
    } finally {
      setLoadingSongs(false);
    }
  }

  // Loads songs from the selected playlist (database)
  async function loadPlaylistSongs(playlistId) {
    try {
      setLoadingSongs(true);
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch all songs from the playlist using batching to handle large playlists
      let allSongs = [];
      let rangeStart = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
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

        if (error) throw error;

        if (batch && batch.length > 0) {
          allSongs = [...allSongs, ...batch];
          rangeStart += batchSize;
          hasMore = batch.length === batchSize; // Continue if we got a full batch
        } else {
          hasMore = false;
        }
      }

      // Transform songs to include liked status and platform
      const songsWithLikes = (allSongs || []).map(song => ({
        ...song,
        isLiked: song.song_likes?.some(like => like.user_id === session.user.id) || false,
        likeCount: song.song_likes?.length || 0,
        platform: song.group_playlists?.platform || 'unknown',
      }));

      setPlaylistSongs(songsWithLikes);
    } catch (e) {
      console.error('[Home] Error loading playlist songs:', e);
    } finally {
      setLoadingSongs(false);
    }
  }

  async function toggleLikeSong(songId, isCurrentlyLiked) {
    const supabase = supabaseBrowser();
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
    if (selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }

  return (
    <div className="min-h-screen text-white w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 md:space-y-10">
      {/* Groups Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="flex items-center space-x-2 text-xl sm:text-2xl font-bold text-white mb-1">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>My Groups</span>
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">Your most active music groups</p>
          </div>
          <Dialog open={createGroupDialog.isOpen} onOpenChange={createGroupDialog.setIsOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start">
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a music group to share playlists and discover new songs with friends.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                {createError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {createError}
                  </div>
                )}
                <TextField
                  id="group-name"
                  label="Group Name"
                  value={groupName}
                  onChange={setGroupName}
                  placeholder="Enter group name"
                  required
                />
                <TextareaField
                  id="group-description"
                  label="Description"
                  description="Optional"
                  value={groupDescription}
                  onChange={setGroupDescription}
                  placeholder="Describe your group"
                />
                <SwitchField
                  id="group-privacy"
                  label="Public Group"
                  description="Anyone can discover and join this group"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={createGroupDialog.close}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={groupsLoading}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {groupsLoading ? "Creating..." : "Create Group"}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {groupsError && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {groupsError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {groupsLoading ? (
            <LoadingState count={3} />
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                description={group.description}
                memberCount={group.memberCount}
                songCount={group.songCount}
                createdAt={group.createdAt || group.created_at}
                onClick={() => onNavigate?.('groups', { groupId: group.id })}
              />
            ))
          ) : (
            <EmptyState
              icon={Users}
              title="No groups yet"
              description="Create your first group to start sharing music with friends"
              action={
                <button
                  onClick={createGroupDialog.open}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Create Your First Group
                </button>
              }
            />
          )}
        </div>
      </section>

      {/* Friends' Song of the Day Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Friends' Song of the Day</h2>
            <p className="text-gray-400 text-xs sm:text-sm">See what your friends are currently vibing to</p>
          </div>
          <button
            onClick={shareSongDialog.open}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="h-4 w-4" />
            Share Song
          </button>
        </div>

        {socialError && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {socialError}
          </div>
        )}

        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
          {socialLoading ? (
            <div className="flex justify-center items-center py-6 sm:py-8">
              <div className="animate-pulse grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 md:gap-6 w-full">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center space-y-2 sm:space-y-3">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/10 rounded-full"></div>
                    <div className="h-2 sm:h-3 bg-white/10 rounded w-12 sm:w-16"></div>
                    <div className="h-1.5 sm:h-2 bg-white/10 rounded w-8 sm:w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : friendsSongsOfTheDay.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 md:gap-8 w-full">
              {friendsSongsOfTheDay.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  className="flex flex-col items-center space-y-3 cursor-pointer group bg-transparent border-none p-0 focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg"
                  onClick={() => {
                    setSelectedSong(friend);
                    setSongDialogOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSong(friend);
                      setSongDialogOpen(true);
                    }
                  }}
                >
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-105 transition-all shadow-lg">
                      {friend.shared_by_avatar ? (
                        <img src={friend.shared_by_avatar} alt={friend.shared_by} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs sm:text-sm md:text-lg font-bold">
                          {friend.shared_by?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-white rounded-full border-2 border-gray-900 flex items-center justify-center shadow-md">
                      <Music className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-gray-900" />
                    </div>
                  </div>

                  <div className="text-center w-full">
                    <p className="text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-1.5 truncate">{friend.shared_by?.split(' ')[0] || 'Friend'}</p>
                    <p className="text-xs font-medium text-white mb-0.5 leading-tight truncate">{friend.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-400 mb-1 leading-tight truncate">{friend.artist || 'Unknown Artist'}</p>
                    {friend.shared_at && (
                      <p className="text-xs text-gray-500">{new Date(friend.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-white/5">
                <Music className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-white">No songs shared today</h3>
              <p className="text-gray-400 text-sm">Be the first to share your song of the day!</p>
            </div>
          )}
        </div>
      </section>

      {/* Communities Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="flex items-center space-x-2 text-xl sm:text-2xl font-bold text-white mb-1">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Trending Communities</span>
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">Discover new music communities</p>
          </div>
          <button
            onClick={communitiesDialog.open}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            Browse All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {communities.map((community) => (
            <button
              key={community.id}
              type="button"
              className="glass-card rounded-xl p-4 sm:p-6 hover:bg-white/5 active:bg-white/5 transition-colors cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-white/20"
              //onClick={() => toast.success(`Joined ${community.name}`)}
              onClick={async () => {
                setSelectedCommunity(community);
                communityDetailDialog.open();
                // Load specific Spotify playlist for this community and show songs directly
                const playlistName = communityPlaylistMap[community.name];
                if (playlistName) {
                  try {
                    setCommunityLoading(true);
                    // Fetch user's Spotify playlists
                    const response = await fetch('/api/spotify/me/playlists?limit=50');
                    if (!response.ok) throw new Error('Failed to fetch Spotify playlists');
                    
                    const data = await response.json();
                    const playlists = data.items || [];
                    
                    // Find the matching playlist
                    const searchName = playlistName.trim().toLowerCase();
                    const matchingPlaylist = playlists.find(p => 
                      p.name.toLowerCase() === searchName || 
                      p.name.toLowerCase().includes(searchName)
                    );
                    
                    if (matchingPlaylist) {
                      // Set as selected playlist and load songs directly
                      const formattedPlaylist = {
                        id: matchingPlaylist.id,
                        name: matchingPlaylist.name,
                        platform: 'spotify',
                        spotify_url: matchingPlaylist.external_urls?.spotify || `https://open.spotify.com/playlist/${matchingPlaylist.id}`,
                        image: matchingPlaylist.images?.[0]?.url,
                        track_count: matchingPlaylist.tracks?.total || 0
                      };
                      setSelectedPlaylist(formattedPlaylist);
                      loadSpotifyPlaylistSongs(matchingPlaylist.id);
                    } else {
                      setCommunityError(`Playlist "${playlistName}" not found`);
                    }
                  } catch (e) {
                    console.error('[Home] Error loading playlist:', e);
                    setCommunityError(e.message || 'Failed to load playlist');
                  } finally {
                    setCommunityLoading(false);
                  }
                }
              }}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-base sm:text-lg mb-1 truncate">{community.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3 line-clamp-2">{community.description}</p>
                </div>
                {community.member_count > 2000 && (
                  <span className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-purple-900/40 text-purple-300 text-xs font-medium rounded-full border border-purple-800/50 ml-2 flex-shrink-0">
                    <TrendingUp className="h-3 w-3" />
                    <span className="hidden sm:inline">Trending</span>
                  </span>
                )}
              </div>
              {/* <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{community.member_count.toLocaleString()} members</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div> */}

              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">{community.member_count.toLocaleString()} members</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{community.group_count?.toLocaleString() || 0} groups</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>

            </button>
          ))}
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-16"></div>

      {/* Dialogs */}
      <SongDetailsDialog
        song={selectedSong}
        open={songDialogOpen}
        onOpenChange={setSongDialogOpen}
      />
      <CommunitiesDialog
        open={communitiesDialog.isOpen}
        onOpenChange={communitiesDialog.setIsOpen}
        communities={communities}
      />

      {/* Updated to support community playlists */}
      <Dialog open={communityDetailDialog.isOpen} onOpenChange={communityDetailDialog.setIsOpen}>
        <DialogContent className="max-w-6xl sm:max-w-6xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedCommunity?.name || 'Community'}</DialogTitle>
            <DialogDescription>
              Discover playlists from your groups
            </DialogDescription>
          </DialogHeader>

          {/* Enable displaying of songs */}
          {communityLoading ? (
            <div className="py-8 text-center text-gray-400">Loading playlists…</div>
          ) : communityError ? (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
              {communityError}
            </div>
          ) : selectedPlaylist ? (
            <div className="flex flex-col min-h-0">
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedPlaylist(null);
                  setPlaylistSongs([]);
                }}
                className="mb-4 text-gray-400 hover:text-white flex items-center gap-2"
              >
                ← Back to playlists
              </button>

              {/* Playlist header */}
              <div className="mb-4">
                <p className="text-sm text-gray-400">{selectedPlaylist.platform}</p>
              </div>

              {/* Songs list */}
              {loadingSongs ? (
                <div className="py-8 text-center text-gray-400">Loading songs…</div>
              ) : playlistSongs.length === 0 ? (
                <div className="py-8 text-center text-gray-400">No songs in this playlist</div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                  {playlistSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => {
                        console.log('[Home] Playing song:', { 
                          title: song.title, 
                          platform: song.platform, 
                          external_id: song.external_id,
                          song 
                        });
                        setCurrentlyPlaying(song);
                      }}
                    >
                      <span className="text-gray-400 text-sm w-6 text-center">{index + 1}</span>
                      
                      {/* Album Art */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex-shrink-0 overflow-hidden relative">
                        {song.thumbnail_url ? (
                          <img 
                            src={song.thumbnail_url} 
                            alt={song.title || 'Album art'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs">
                            {song.title?.charAt(0) || '?'}
                          </div>
                        )}
                        {/* Play button overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{song.title || 'Untitled'}</p>
                        <p className="text-gray-400 text-sm truncate">{song.artist || 'Unknown Artist'}</p>
                      </div>
                      
                      {/* Like Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeSong(song.id, song.isLiked);
                        }}
                        className="p-2 hover:scale-110 transition-transform flex-shrink-0"
                        aria-label={song.isLiked ? 'Unlike song' : 'Like song'}
                      >
                        <Heart
                          className={`h-5 w-5 ${song.isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        />
                      </button>
                      
                      {song.duration && (
                        <span className="text-gray-400 text-sm w-12 text-right flex-shrink-0">
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : communityPlaylists.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No playlists yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {communityPlaylists.map((p) => (
                <div key={p.id} className="glass-card rounded-xl p-4">
                  {p.image && (
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <div className="text-sm text-gray-400 mb-1 uppercase">{p.platform}</div>
                  <div className="font-semibold text-white truncate mb-1">{p.name}</div>
                  {p.track_count > 0 && (
                    <div className="text-xs text-gray-500 mb-3">{p.track_count} tracks</div>
                  )}
                  <button
                    className="mt-3 w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15"
                    onClick={() => {
                      setSelectedPlaylist(p);
                      loadSpotifyPlaylistSongs(p.id);
                    }}
                  >
                    View Playlist
                  </button>
                </div>
              ))}
            </div>
          )}  

          {/* Block commented: lines 440-465
          {communityLoading ? (
            <div className="py-8 text-center text-gray-400">Loading playlists…</div>
          ) : communityError ? (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
              {communityError}
            </div>
          ) : communityPlaylists.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No playlists yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {communityPlaylists.map((p) => (
                <div key={p.id} className="glass-card rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1 uppercase">{p.platform}</div>
                  <div className="font-semibold text-white truncate">{p.name}</div>
                  <button
                    className="mt-3 w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15"
                    onClick={() => {
                      setSelectedPlaylist(p);
                      loadPlaylistSongs(p.id);
                    }}
                  >
                    View Playlist
                  </button>
                </div>
              ))}
            </div>
          )}
          */}
        </DialogContent>
      </Dialog>

      <ShareSongDialog
        open={shareSongDialog.isOpen}
        onOpenChange={shareSongDialog.setIsOpen}
      />

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

// embed player so songs can be played from the trending communities tab
function EmbeddedPlayer({ song, onClose }) {
  const getEmbedUrl = () => {
    if (!song) {
      console.error('[EmbeddedPlayer] No song provided');
      return null;
    }

    if (!song.external_id) {
      console.error('[EmbeddedPlayer] Song missing external_id:', song);
      return null;
    }

    if (song.platform === 'youtube') {
      return `https://www.youtube.com/embed/${song.external_id}`;
    } else if (song.platform === 'spotify') {
      return `https://open.spotify.com/embed/track/${song.external_id}?utm_source=generator&theme=0`;
    }
    
    console.error('[EmbeddedPlayer] Unknown platform:', song.platform);
    return null;
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) {
    console.error('[EmbeddedPlayer] Could not generate embed URL for song:', song);
    return null;
  }

  const playerWidth = song.platform === 'youtube' ? 360 : 400;
  const playerHeight = song.platform === 'youtube' ? 203 : 152; // 16:9 for YouTube

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ width: `${playerWidth}px` }}>
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
          className="ml-2 p-1 hover:bg-gray-700 active:bg-gray-700 rounded transition-colors flex-shrink-0"
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

