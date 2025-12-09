'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, TrendingUp, ChevronRight, Music, AlertCircle, ExternalLink, Youtube } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useGroups } from "../hooks/useGroups";
import { useSocial } from "../hooks/useSocial";
import { GroupCard } from "./shared/GroupCard";
import { LoadingState } from "./shared/LoadingState";
import { EmptyState } from "./shared/EmptyState";
import { useDialog } from "../hooks/useDialog";
import { FriendSongCard } from "./shared/FriendSongCard";
import { CommunitiesDialog } from "./shared/CommunitiesDialog";
import SongSearchModal from "./SongSearchModal";
import { toast } from "sonner";
import ExportPlaylistButton from "./ExportPlaylistButton";
import ExportToSpotifyButton from "./ExportToSpotifyButton";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useMiniplayer } from "@/lib/context/GlobalStateContext";
/**
 * HomePage component - Main dashboard view for authenticated users
 * Displays groups, friends' songs, and music communities (tehe)
 * @param {Object} props
 * @param {Function} props.onNavigate - Optional navigation handler for routing
 */
export function HomePage({ onNavigate } = {}) {
  const router = useRouter();
  const { groups, createGroup, loading: groupsLoading, error: groupsError } = useGroups();
  const { friendsSongsOfTheDay, communities, loading: socialLoading, error: socialError } = useSocial();
  const { playSong } = useMiniplayer();
  const createGroupDialog = useDialog();
  const communitiesDialog = useDialog();
  const [showSongSearchModal, setShowSongSearchModal] = useState(false);
  
  // Added dialogue hook and state (delete this comment later)
  const communityDetailDialog = useDialog();
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [communitySongs, setCommunitySongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [hasYouTube, setHasYouTube] = useState(false);
  const [hasSpotify, setHasSpotify] = useState(false);

  // Admin access easter egg
  const [adminClickCount, setAdminClickCount] = useState(0);
  const adminClickTimeoutRef = useRef(null);
  const ADMIN_CLICKS_REQUIRED = 10;
  const ADMIN_CLICK_TIMEOUT = 3000; // 3 seconds to complete all clicks

  const navigate = onNavigate ?? ((screen, params) => {
    if (!screen) return;
    if (screen === 'groups' && params?.groupSlug) {
      router.push(`/groups/${params.groupSlug}`);
      return;
    }
    router.push(`/${screen}`);
  });

  const handleAdminClick = () => {
    // Clear existing timeout
    if (adminClickTimeoutRef.current) {
      clearTimeout(adminClickTimeoutRef.current);
    }

    const newCount = adminClickCount + 1;
    setAdminClickCount(newCount);

    if (newCount >= ADMIN_CLICKS_REQUIRED) {
      // Success! Redirect to admin console
      setAdminClickCount(0);
      router.push('/admin/communities');
      toast.success('Admin access granted');
    } else {
      // Set timeout to reset counter if user doesn't click fast enough
      adminClickTimeoutRef.current = setTimeout(() => {
        setAdminClickCount(0);
      }, ADMIN_CLICK_TIMEOUT);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (adminClickTimeoutRef.current) {
        clearTimeout(adminClickTimeoutRef.current);
      }
    };
  }, []);

  // Check if user has YouTube/Google and Spotify connected
  useEffect(() => {
    const checkConnections = async () => {
      const supabase = supabaseBrowser();
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
    };
    checkConnections();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      setCreateError("");
      await createGroup(groupName, groupDescription);
      createGroupDialog.close();
      setGroupName("");
      setGroupDescription("");
      toast.success("Group created successfully!");
    } catch (error) {
      setCreateError(error.message || "Failed to create group");
    }
  };

  // Handle setting song of the day (same as profile page)
  const handleSetSongOfDay = async (song) => {
    try {
      const response = await fetch('/api/song-of-the-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: song.id || `${song.name}-${song.artist}`.replace(/\s+/g, '-').toLowerCase(),
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
      if (data.success) {
        toast.success(`"${song.name}" is now your song of the day!`);
        setShowSongSearchModal(false);
      } else {
        toast.error(data.error || "Couldn't share your song. Please try again.");
      }
    } catch (error) {
      console.error('Error setting song of the day:', error);
      toast.error("Couldn't share your song. Please try again.");
    }
  };

  return (
    <div className="min-h-screen text-[var(--foreground)] w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 md:space-y-10">
      {/* Groups Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="flex items-center space-x-2 text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-1">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>My Groups</span>
            </h2>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">Your most active music groups</p>
          </div>
          <button 
            onClick={createGroupDialog.open}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 btn-primary rounded-lg text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </button>
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
            groups.slice(0, 3).map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                description={group.description}
                memberCount={group.memberCount}
                songCount={group.songCount}
                createdAt={group.createdAt || group.created_at}
                onClick={() => navigate('groups', { groupSlug: group.slug || group.id })}
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
                  className="px-4 sm:px-6 py-2 sm:py-3 btn-primary rounded-lg text-sm sm:text-base w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Create Your First Group
                </button>
              }
            />
          )}
        </div>
        
        {/* View All Groups Link */}
        {groups.length > 3 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('groups')}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              View all {groups.length} groups →
            </button>
          </div>
        )}
      </section>

      {/* Friends' Song of the Day Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-1">Friends' Song of the Day</h2>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">See what your friends are currently vibing to</p>
          </div>
          <button
            onClick={() => setShowSongSearchModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 btn-primary rounded-lg text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
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
            <div className="flex flex-wrap justify-center gap-3 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4 w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-xl p-2.5 sm:p-3 flex flex-col items-center w-[100px] sm:w-auto">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-[var(--glass-border)] rounded-full mb-1.5 sm:mb-2"></div>
                  <div className="h-2.5 sm:h-3 bg-[var(--glass-border)] rounded w-14 sm:w-16 mb-1"></div>
                  <div className="h-2 bg-[var(--glass-border)] rounded w-16 sm:w-20 mb-0.5"></div>
                  <div className="h-2 bg-[var(--glass-border)] rounded w-14"></div>
                </div>
              ))}
            </div>
          ) : friendsSongsOfTheDay.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4 w-full">
              {friendsSongsOfTheDay.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    setSelectedSong(friend);
                    setSongDialogOpen(true);
                  }}
                  className="flex flex-col items-center p-2.5 sm:p-3 cursor-pointer group bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] border border-[var(--glass-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-all w-[100px] sm:w-auto"
                >
                  {/* Avatar with music badge */}
                  <div className="relative mb-1.5 sm:mb-2 flex-shrink-0">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-br from-[var(--accent)] to-pink-500 group-hover:scale-105 transition-transform shadow-lg">
                      {friend.shared_by_avatar ? (
                        <img src={friend.shared_by_avatar} alt={friend.shared_by} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                          {friend.shared_by?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-[var(--background)] rounded-full border-2 border-[var(--glass-border)] flex items-center justify-center">
                      <Music className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-[var(--accent)]" />
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="text-center w-full flex flex-col min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-[var(--foreground)] truncate">{friend.shared_by?.split(' ')[0] || 'Friend'}</p>
                    <p className="text-[10px] sm:text-xs text-[var(--foreground)] truncate mt-0.5 sm:mt-1 leading-tight">{friend.parsed_title || friend.title || 'Untitled'}</p>
                    <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] truncate leading-tight">{friend.parsed_artist || friend.artist || 'Unknown'}</p>
                  </div>

                  {/* Time - hidden on mobile */}
                  {friend.shared_at && (
                    <p className="hidden sm:block text-xs text-[var(--muted-foreground)] opacity-70 mt-auto pt-1 flex-shrink-0">
                      {new Date(friend.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-white/5 [data-theme='light']:bg-black/5">
                <Music className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-[var(--foreground)]">No songs shared today</h3>
              <p className="text-[var(--muted-foreground)] text-sm">Be the first to share your song of the day!</p>
            </div>
          )}
        </div>
      </section>

      {/* Communities Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="flex items-center space-x-2 text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-1">
              <Music className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Our Favorites</span>
            </h2>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">These playlists are what we&apos;re currently listening to</p>
          </div>
          <button
            onClick={communitiesDialog.open}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 btn-secondary rounded-lg text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            Browse All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {communities.slice(0, 3).map((community) => (
            <button
              key={community.id}
              type="button"
              className="glass-card rounded-xl p-4 hover:bg-[var(--secondary-hover)] transition-all cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 h-[160px] flex flex-col"
              onClick={async () => {
                setSelectedCommunity(community);
                communityDetailDialog.open();
                
                // Fetch songs for this community
                if (community.id) {
                  setLoadingSongs(true);
                  setCommunitySongs([]);
                  try {
                    const response = await fetch(`/api/communities/${community.id}/playlist-songs`);
                    if (response.ok) {
                      const data = await response.json();
                      setCommunitySongs(data.songs || []);
                    }
                  } catch (error) {
                    console.error('Error fetching community songs:', error);
                  } finally {
                    setLoadingSongs(false);
                  }
                }
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-[var(--foreground)] text-sm sm:text-base truncate flex-1">
                  {community.name}
                </h3>
                {community.member_count > 2000 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium rounded-full border border-[var(--accent)]/30 flex-shrink-0">
                    <TrendingUp className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Description - flexible */}
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 flex-1 min-h-[32px]">
                {community.description || 'No description'}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--glass-border)] mt-auto">
                <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {community.playlist_links?.length || 0} playlists
                  </span>
                  <span>{community.song_count || 0} songs</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </button>
          ))}
        </div>
        
        {/* View All Favorites Link */}
        {communities.length > 3 && (
          <div className="mt-4 text-center">
            <button
              onClick={communitiesDialog.open}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              View all {communities.length} favorites →
            </button>
          </div>
        )}
      </section>

      {/* Bottom spacing */}
      <div className="h-16"></div>

      {/* Dialogs */}
      <FriendSongCard
        song={selectedSong}
        open={songDialogOpen}
        onOpenChange={setSongDialogOpen}
      />
      <CommunitiesDialog
        open={communitiesDialog.isOpen}
        onOpenChange={communitiesDialog.setIsOpen}
        communities={communities}
        onViewCommunity={async (community) => {
          setSelectedCommunity(community);
          communityDetailDialog.open();
          
          // Fetch songs for this community
          if (community.id) {
            setLoadingSongs(true);
            setCommunitySongs([]);
            try {
              const response = await fetch(`/api/communities/${community.id}/playlist-songs`);
              if (response.ok) {
                const data = await response.json();
                setCommunitySongs(data.songs || []);
              }
            } catch (error) {
              console.error('Error fetching community songs:', error);
            } finally {
              setLoadingSongs(false);
            }
          }
        }}
      />

      {/* Community Detail Dialog */}
      <Dialog open={communityDetailDialog.isOpen} onOpenChange={communityDetailDialog.setIsOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-3xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4 pr-8">
            {/* Title and description */}
            <DialogTitle className="text-lg sm:text-xl md:text-2xl pr-4">{selectedCommunity?.name || 'Community'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
              {selectedCommunity?.description || 'Music community'}
            </DialogDescription>
            
            {/* Export Buttons - Below title on mobile, inline on desktop */}
            {selectedCommunity && (hasSpotify || hasYouTube) && (
              <div className="flex items-center gap-2 mt-3">
                {hasSpotify && (
                  <ExportToSpotifyButton
                    sourceType="community"
                    sourceId={selectedCommunity.id}
                    defaultName={selectedCommunity.name}
                  />
                )}
                {hasYouTube && (
                  <ExportPlaylistButton
                    sourceType="community"
                    sourceId={selectedCommunity.id}
                    defaultName={selectedCommunity.name}
                  />
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Playlist Links Section - Fixed height */}
            {selectedCommunity?.playlist_links && selectedCommunity.playlist_links.length > 0 && (
              <div className="space-y-2 sm:space-y-3 flex-shrink-0 mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                  Playlist Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCommunity.playlist_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors h-[56px]"
                    >
                      <ExternalLink className="h-4 w-4 text-[var(--accent)] flex-shrink-0" />
                      <p className="flex-1 min-w-0 text-sm font-medium text-[var(--foreground)] truncate">
                        {link.label || `${link.platform} playlist`}
                      </p>
                      <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Curated Songs Section - Fills remaining space */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between flex-shrink-0 mb-2">
                <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                  Curated Songs
                </h3>
                {selectedCommunity?.song_count !== undefined && (
                  <span className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary-bg)] px-2 py-0.5 sm:py-1 rounded-full">
                    {selectedCommunity.song_count} approved
                  </span>
                )}
              </div>
              
              {loadingSongs ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto modal-scroll pr-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--glass-border)] h-[72px]">
                      <div className="w-12 h-12 rounded-lg bg-[var(--glass-border)] flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3 bg-[var(--glass-border)] rounded w-3/4" />
                        <div className="h-2 bg-[var(--glass-border)] rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : communitySongs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto modal-scroll pr-1 content-start">
                  {communitySongs
                    .filter(song => song.curation_status === 'approved')
                    .map((song, idx) => {
                      // Use cleaned title/artist if available
                      const displayTitle = song.parsed_title || song.title || 'Untitled';
                      const displayArtist = song.parsed_artist || song.artist || 'Unknown Artist';
                      
                      // Build URLs for both platforms
                      const getSpotifyUrl = () => {
                        if (song.spotify_url) return song.spotify_url + (song.spotify_url.includes('?') ? '&autoplay=true' : '?autoplay=true');
                        if (song.platform === 'spotify' && song.id) return `https://open.spotify.com/track/${song.id}?autoplay=true`;
                        // Search fallback
                        const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
                        return `https://open.spotify.com/search/${searchQuery}`;
                      };
                      
                      const getYouTubeUrl = () => {
                        if (song.youtube_url) return song.youtube_url + (song.youtube_url.includes('?') ? '&autoplay=1' : '?autoplay=1');
                        if (song.platform === 'youtube' && song.id) return `https://www.youtube.com/watch?v=${song.id}&autoplay=1`;
                        // Search fallback
                        const searchQuery = encodeURIComponent(`${displayTitle} ${displayArtist}`);
                        return `https://www.youtube.com/results?search_query=${searchQuery}`;
                      };
                      
                      const spotifyUrl = getSpotifyUrl();
                      const youtubeUrl = getYouTubeUrl();
                      const isSpotifyDirect = song.spotify_url || song.platform === 'spotify';
                      const isYouTubeDirect = song.youtube_url || song.platform === 'youtube';

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
                        } else if (song.platform === 'spotify' && (song.external_id || song.id)) {
                          platform = 'spotify';
                          external_id = song.external_id || song.id;
                        }
                        
                        if (!platform && song.youtube_url) {
                          const ytMatch = song.youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                          if (ytMatch) {
                            platform = 'youtube';
                            external_id = ytMatch[1];
                          }
                        } else if (!platform && song.platform === 'youtube' && (song.external_id || song.id)) {
                          platform = 'youtube';
                          external_id = song.external_id || song.id;
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
                            thumbnail_url: song.thumbnail,
                          });
                        }
                      };

                      const canPlayInMiniplayer = !!(song.spotify_url || song.youtube_url || ((song.platform === 'spotify' || song.platform === 'youtube') && (song.external_id || song.id)));
                      
                      return (
                        <button
                          key={song.id || idx}
                          onClick={canPlayInMiniplayer ? handlePlayInMiniplayer : undefined}
                          disabled={!canPlayInMiniplayer}
                          className={`flex items-center gap-3 p-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--glass-border)] hover:bg-[var(--secondary-hover)] hover:border-[var(--glass-border-hover)] transition-colors h-[72px] w-full text-left ${canPlayInMiniplayer ? 'cursor-pointer group' : ''}`}
                        >
                          {/* Thumbnail - fixed size with play overlay */}
                          <div className="relative w-12 h-12 flex-shrink-0">
                            {song.thumbnail ? (
                              <img
                                src={song.thumbnail}
                                alt={displayTitle}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center">
                                <Music className="h-5 w-5 text-[var(--muted-foreground)]" />
                              </div>
                            )}
                            {/* Play overlay */}
                            {canPlayInMiniplayer && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">
                              {displayTitle}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {displayArtist}
                            </p>
                          </div>
                          {/* Platform Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a
                              href={spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSpotifyDirect 
                                  ? 'hover:bg-green-500/20' 
                                  : 'hover:bg-green-500/10 opacity-60 hover:opacity-100'
                              }`}
                              title={isSpotifyDirect ? 'Open in Spotify' : 'Search on Spotify'}
                            >
                              <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                            </a>
                            <a
                              href={youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isYouTubeDirect 
                                  ? 'hover:bg-red-500/20' 
                                  : 'hover:bg-red-500/10 opacity-60 hover:opacity-100'
                              }`}
                              title={isYouTubeDirect ? 'Open in YouTube' : 'Search on YouTube'}
                            >
                              <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            </a>
                          </div>
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-12 text-[var(--muted-foreground)]">
                  <Music className="h-12 w-12 sm:h-14 sm:w-14 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No curated songs yet</p>
                  <p className="text-xs mt-1 opacity-75">Songs will appear here once approved</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Song Search Modal for sharing song of the day */}
      {showSongSearchModal && (
        <SongSearchModal
          onClose={() => setShowSongSearchModal(false)}
          onSelectSong={handleSetSongOfDay}
        />
      )}

      {/* Create Group Modal - matches groups page exactly */}
      {createGroupDialog.isOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 min-h-[100dvh] bg-black/70 [data-theme='light']:bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--dropdown-bg)] [data-theme='light']:bg-white rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl border-2 border-[var(--glass-border)] [data-theme='light']:border-black/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[var(--foreground)]">Create Group</h2>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="My Music Group"
                  className="w-full px-4 py-3 bg-[var(--background)] [data-theme='light']:bg-white border-2 border-[var(--glass-border)] [data-theme='light']:border-black/20 rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] [data-theme='light']:focus:border-black text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--background)] [data-theme='light']:bg-white border-2 border-[var(--glass-border)] [data-theme='light']:border-black/20 rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] [data-theme='light']:focus:border-black text-sm sm:text-base resize-none"
                />
              </div>

              {createError && (
                <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {createError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    createGroupDialog.close();
                    setGroupName('');
                    setGroupDescription('');
                    setCreateError('');
                  }}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 btn-secondary rounded-lg text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={groupsLoading || !groupName}
                  className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 btn-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {groupsLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden admin access button - click 10 times quickly in bottom right corner */}
      <button
        onClick={handleAdminClick}
        className="fixed bottom-4 right-4 w-12 h-12 opacity-0 pointer-events-auto cursor-pointer z-50"
        aria-label=""
        title=""
        style={{ 
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none'
        }}
      >
        {/* Invisible clickable area for admin access easter egg */}
      </button>
    </div>
  );
}

