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
      await createGroup(groupName, groupDescription, false); // default to public
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-[var(--secondary-bg)] border border-[var(--glass-border)] rounded-xl p-3 h-[140px] sm:h-[160px] flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[var(--glass-border)] rounded-full mb-2"></div>
                  <div className="h-3 bg-[var(--glass-border)] rounded w-16 mb-1"></div>
                  <div className="h-2 bg-[var(--glass-border)] rounded w-20 mb-1"></div>
                  <div className="h-2 bg-[var(--glass-border)] rounded w-14"></div>
                </div>
              ))}
            </div>
          ) : friendsSongsOfTheDay.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
              {friendsSongsOfTheDay.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  className="flex flex-col items-center p-3 cursor-pointer group bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] border border-[var(--glass-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all h-[140px] sm:h-[160px]"
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
                  {/* Avatar */}
                  <div className="relative mb-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-105 transition-transform shadow-lg">
                      {friend.shared_by_avatar ? (
                        <img src={friend.shared_by_avatar} alt={friend.shared_by} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                          {friend.shared_by?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[var(--background)] rounded-full border-2 border-[var(--glass-border)] flex items-center justify-center">
                      <Music className="h-2.5 w-2.5 text-[var(--accent)]" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="text-center w-full flex-1 flex flex-col justify-center min-w-0">
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate">{friend.shared_by?.split(' ')[0] || 'Friend'}</p>
                    <p className="text-xs text-[var(--foreground)] truncate mt-1">{friend.title || 'Untitled'}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{friend.artist || 'Unknown'}</p>
                  </div>

                  {/* Time */}
                  {friend.shared_at && (
                    <p className="text-xs text-[var(--muted-foreground)] opacity-70 mt-auto pt-1">
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
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-900/40 text-purple-300 text-xs font-medium rounded-full border border-purple-800/50 flex-shrink-0">
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
        
        {/* View All Communities Link */}
        {communities.length > 3 && (
          <div className="mt-4 text-center">
            <button
              onClick={communitiesDialog.open}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              View all {communities.length} communities →
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
                      // Build external URL based on platform
                      // API returns song.id as the actual track/video ID
                      const getExternalUrl = () => {
                        if (song.platform === 'spotify') {
                          if (song.spotify_url) return song.spotify_url + (song.spotify_url.includes('?') ? '&autoplay=true' : '?autoplay=true');
                          if (song.id) return `https://open.spotify.com/track/${song.id}?autoplay=true`;
                        }
                        if (song.platform === 'youtube') {
                          if (song.youtube_url) return song.youtube_url + (song.youtube_url.includes('?') ? '&autoplay=1' : '?autoplay=1');
                          if (song.id) return `https://www.youtube.com/watch?v=${song.id}&autoplay=1`;
                        }
                        return null;
                      };
                      const externalUrl = getExternalUrl();
                      
                      return (
                        <button
                          key={song.id || idx}
                          onClick={() => {
                            if (externalUrl) {
                              window.open(externalUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--glass-border)] hover:bg-[var(--secondary-hover)] transition-colors h-[72px] w-full text-left ${externalUrl ? 'cursor-pointer hover:border-[var(--glass-border-hover)]' : 'cursor-default opacity-60'}`}
                          disabled={!externalUrl}
                          title={externalUrl ? `Open in ${song.platform === 'spotify' ? 'Spotify' : 'YouTube'}` : 'No link available'}
                        >
                          {/* Thumbnail - fixed size */}
                          {song.thumbnail ? (
                            <img
                              src={song.thumbnail}
                              alt={song.title}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center flex-shrink-0">
                              <Music className="h-5 w-5 text-[var(--muted-foreground)]" />
                            </div>
                          )}
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">
                              {song.title}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {song.artist || 'Unknown Artist'}
                            </p>
                            <span className={`inline-block text-xs capitalize ${song.platform === 'spotify' ? 'text-green-400' : song.platform === 'youtube' ? 'text-red-400' : 'text-[var(--accent)]'}`}>
                              {song.platform}
                            </span>
                          </div>
                          {/* External link indicator */}
                          {externalUrl && (
                            <div className={`flex-shrink-0 p-1.5 rounded-lg ${song.platform === 'spotify' ? 'hover:bg-green-500/20' : 'hover:bg-red-500/20'}`}>
                              <ExternalLink className={`h-4 w-4 ${song.platform === 'spotify' ? 'text-green-400' : 'text-red-400'}`} />
                            </div>
                          )}
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
        <div className="fixed inset-0 bg-black/80 [data-theme='light']:bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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

