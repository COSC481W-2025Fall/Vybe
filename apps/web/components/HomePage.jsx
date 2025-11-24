'use client';

import { useState } from "react";
import { Users, Plus, TrendingUp, ChevronRight, Music, AlertCircle } from "lucide-react";
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
          <Dialog open={createGroupDialog.isOpen} onOpenChange={createGroupDialog.setIsOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-200 active:bg-gray-200 [data-theme='light']:bg-white [data-theme='light']:hover:bg-gray-100 [data-theme='light']:active:bg-gray-100 text-black rounded-lg font-medium transition-colors border border-gray-300 [data-theme='light']:border-gray-300 text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start">
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
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:active:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 [data-theme='light']:border-black/20 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={groupsLoading}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-200 active:bg-gray-200 [data-theme='light']:bg-white [data-theme='light']:hover:bg-gray-100 [data-theme='light']:active:bg-gray-100 text-black rounded-lg font-medium transition-colors border border-gray-300 [data-theme='light']:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-gray-200 active:bg-gray-200 [data-theme='light']:bg-white [data-theme='light']:hover:bg-gray-100 [data-theme='light']:active:bg-gray-100 text-black rounded-lg font-medium transition-colors border border-gray-300 [data-theme='light']:border-gray-300 text-sm sm:text-base w-full sm:w-auto"
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
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-1">Friends' Song of the Day</h2>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">See what your friends are currently vibing to</p>
          </div>
          <button
            onClick={shareSongDialog.open}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-gray-200 active:bg-gray-200 [data-theme='light']:bg-white [data-theme='light']:hover:bg-gray-100 [data-theme='light']:active:bg-gray-100 text-black rounded-lg font-medium transition-colors border border-gray-300 [data-theme='light']:border-gray-300 text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
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
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/10 [data-theme='light']:bg-black/10 rounded-full"></div>
                    <div className="h-2 sm:h-3 bg-white/10 [data-theme='light']:bg-black/10 rounded w-12 sm:w-16"></div>
                    <div className="h-1.5 sm:h-2 bg-white/10 [data-theme='light']:bg-black/10 rounded w-8 sm:w-12"></div>
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
                        <div className="w-full h-full flex items-center justify-center text-[var(--foreground)] text-xs sm:text-sm md:text-lg font-bold">
                          {friend.shared_by?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-white [data-theme='light']:bg-white rounded-full border-2 border-gray-900 [data-theme='light']:border-gray-100 flex items-center justify-center shadow-md">
                      <Music className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-gray-900 [data-theme='light']:text-gray-900" />
                    </div>
                  </div>

                  <div className="text-center w-full">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)] mb-1 sm:mb-1.5 truncate">{friend.shared_by?.split(' ')[0] || 'Friend'}</p>
                    <p className="text-xs font-medium text-[var(--foreground)] mb-0.5 leading-tight truncate">{friend.title || 'Untitled'}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-1 leading-tight truncate">{friend.artist || 'Unknown Artist'}</p>
                    {friend.shared_at && (
                      <p className="text-xs text-[var(--muted-foreground)] opacity-70">{new Date(friend.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
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
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Trending Communities</span>
            </h2>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">Discover new music communities</p>
          </div>
          <button
            onClick={communitiesDialog.open}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10 [data-theme='light']:active:bg-black/10 text-[var(--foreground)] rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20 [data-theme='light']:border-black/20 text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
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
              onClick={() => {
                setSelectedCommunity(community);
                communityDetailDialog.open();
              }}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)] text-base sm:text-lg mb-1 truncate">{community.name}</h3>
                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mb-2 sm:mb-3 line-clamp-2">{community.description}</p>
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
                <span className="text-sm text-[var(--muted-foreground)]">{community.member_count.toLocaleString()} members</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">{community.group_count?.toLocaleString() || 0} groups</span>
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
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

      {/* For now, added 3 empty pop ups to the trending communities button */}
      <Dialog open={communityDetailDialog.isOpen} onOpenChange={communityDetailDialog.setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCommunity?.name || 'Community'}</DialogTitle>
            <DialogDescription>
              {/* Leave blank for now */}
            </DialogDescription>
          </DialogHeader>
          <div>
            {/* Leave blank for now */}
          </div>
        </DialogContent>
      </Dialog>

      <ShareSongDialog
        open={shareSongDialog.isOpen}
        onOpenChange={shareSongDialog.setIsOpen}
      />
    </div>
  );
}

