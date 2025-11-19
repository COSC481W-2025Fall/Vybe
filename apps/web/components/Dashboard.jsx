'use client';

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share, MoreHorizontal, Users, Plus, TrendingUp, ChevronRight, Music, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./common/ImageWithFallback";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { useGroups } from "../hooks/useGroups";
import { useSocial } from "../hooks/useSocial";
import FullGroupCard from "./shared/FullGroupCard";
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
  const { songOfTheDay, friendsSongsOfTheDay, communities, loading: socialLoading, error: socialError } = useSocial();
  const createGroupDialog = useDialog();
  const communitiesDialog = useDialog();
  const shareSongDialog = useDialog();
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
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Groups Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Users className="h-5 w-5" />
              <span>My Groups</span>
            </h2>
            <p className="text-sm text-gray-400">Your most active music groups</p>
          </div>
          <Dialog open={createGroupDialog.isOpen} onOpenChange={createGroupDialog.setIsOpen}>
          <DialogTrigger asChild>
              <button type="button" className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/15">
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
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
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
                <div className="flex justify-between">
                  <button type="submit" disabled={groupsLoading} className="px-6 py-2 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {groupsLoading ? "Creating..." : "Create Group"}
                  </button>
                  <button type="button" onClick={createGroupDialog.close} className="px-6 py-2 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/15">
                    Cancel
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {groupsError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{groupsError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupsLoading ? (
            <LoadingState count={3} />
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <FullGroupCard
                key={group.id}
                group={{
                  id: group.id,
                  name: group.name,
                  description: group.description,
                  created_at: group.createdAt || group.created_at,
                  memberCount: group.memberCount,
                  playlist_songs: [],
                  join_code: group.join_code,
                  owner_id: group.owner_id,
                }}
                isOwner={false}
                onClick={() => onNavigate?.('groups', { groupId: group.id })}
              />
            ))
          ) : (
            <EmptyState
              icon={Users}
              title="No groups yet"
              description="Create your first group to start sharing music with friends"
              action={
                <button type="button" onClick={createGroupDialog.open} className="px-6 py-3 bg-white hover:bg-gray-200 active:bg-gray-200 text-black rounded-lg font-medium transition-colors">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </button>
              }
            />
          )}
        </div>
      </section>

      {/* Friends' Song of the Day Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Friends' Song of the Day</h2>
            <p className="text-sm text-gray-400">See what your friends are currently vibing to</p>
          </div>
          <button type="button" onClick={shareSongDialog.open} className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/15">
            <Plus className="h-4 w-4 mr-2" />
            Share Song
          </button>
        </div>
        
        {socialError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{socialError}</AlertDescription>
          </Alert>
        )}

        <Card className="glass-card">
          <CardContent className="p-6">
            {socialLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-pulse grid grid-cols-3 md:grid-cols-6 gap-6 w-full">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center space-y-3">
                      <div className="w-40 h-40 bg-muted rounded-full"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                      <div className="h-2 bg-muted rounded w-16"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : friendsSongsOfTheDay.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 w-full">
                {friendsSongsOfTheDay.map((friend) => (
                  <div 
                    key={friend.id} 
                    className="flex flex-col items-center space-y-3 cursor-pointer group"
                    onClick={() => {
                      setSelectedSong(friend);
                      setSongDialogOpen(true);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="w-40 h-40 group-hover:scale-105 transition-all">
                        <AvatarImage src={friend.shared_by_avatar} alt={friend.shared_by} />
                        <AvatarFallback className="text-2xl">
                          {friend.shared_by.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full border-3 border-background flex items-center justify-center">
                        <Music className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                    
                    <div className="text-center w-full">
                      <p className="text-sm font-medium mb-1">{friend.shared_by.split(' ')[0]}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium leading-tight">{friend.title}</p>
                        <p className="leading-tight">{friend.artist}</p>
                        <p className="text-xs">{new Date(friend.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No songs shared today</h3>
                <p className="text-muted-foreground">Be the first to share your song of the day!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Communities Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Communities</h2>
            <p className="text-sm text-gray-400">Discover music communities and connect with like-minded listeners</p>
          </div>
          <button type="button" onClick={communitiesDialog.open} className="px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/15">
            Browse All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {communities.map((community) => (
            <Card 
              key={community.id} 
              className="glass-card hover:bg-accent/50 active:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => toast.success(`Joined ${community.name}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{community.name}</h3>
                  {community.member_count > 2000 && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Trending</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{community.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{community.member_count.toLocaleString()} members</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
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
      <ShareSongDialog
        open={shareSongDialog.isOpen}
        onOpenChange={shareSongDialog.setIsOpen}
      />
    </div>
  );
}

