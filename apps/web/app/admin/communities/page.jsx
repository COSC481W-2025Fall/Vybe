'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { TextField, TextareaField } from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ExternalLink, Music, Check, X, Filter, RefreshCw, Search, Save, Copy, Download, Upload, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCommunity, setEditingCommunity] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [curatingCommunity, setCuratingCommunity] = useState(null);
  const [isCurationDialogOpen, setIsCurationDialogOpen] = useState(false);
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'removed'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingInline, setEditingInline] = useState(null); // Community ID being edited inline
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [playlistLinks, setPlaylistLinks] = useState([]);
  
  // Inline edit state
  const [inlineName, setInlineName] = useState('');
  const [inlineDescription, setInlineDescription] = useState('');

  useEffect(() => {
    checkAuth();
    loadCommunities();
  }, []);

  const checkAuth = async () => {
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/sign-in');
    }
  };

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/communities');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load communities');
      }

      setCommunities(data.communities || []);
    } catch (error) {
      console.error('Error loading communities:', error);
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCommunity(null);
    setName('');
    setDescription('');
    setPlaylistLinks([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (community) => {
    setEditingCommunity(community);
    setName(community.name || '');
    setDescription(community.description || '');
    setPlaylistLinks(community.playlist_links || []);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Community name is required');
      return;
    }

    try {
      const url = editingCommunity 
        ? `/api/communities/${editingCommunity.id}`
        : '/api/communities';
      
      const method = editingCommunity ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          member_count: 0,
          group_count: 0,
          playlist_links: playlistLinks
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save community');
      }

      toast.success(editingCommunity ? 'Community updated' : 'Community created');
      setIsDialogOpen(false);
      loadCommunities();
    } catch (error) {
      console.error('Error saving community:', error);
      toast.error(error.message || 'Failed to save community');
    }
  };

  const handleDelete = async (community) => {
    if (!confirm(`Are you sure you want to delete "${community.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/communities/${community.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete community');
      }

      toast.success('Community deleted');
      loadCommunities();
    } catch (error) {
      console.error('Error deleting community:', error);
      toast.error(error.message || 'Failed to delete community');
    } finally {
      setIsDeleting(false);
    }
  };

  const addPlaylistLink = () => {
    setPlaylistLinks([...playlistLinks, { platform: 'spotify', url: '', label: '' }]);
  };

  const removePlaylistLink = (index) => {
    setPlaylistLinks(playlistLinks.filter((_, i) => i !== index));
  };

  const updatePlaylistLink = (index, field, value) => {
    const updated = [...playlistLinks];
    updated[index] = { ...updated[index], [field]: value };
    setPlaylistLinks(updated);
  };

  const openCurationDialog = async (community) => {
    setCuratingCommunity(community);
    setIsCurationDialogOpen(true);
    await loadSongs(community.id);
  };

  const loadSongs = async (communityId) => {
    try {
      setLoadingSongs(true);
      const response = await fetch(`/api/communities/${communityId}/playlist-songs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load songs');
      }

      setSongs(data.songs || []);
    } catch (error) {
      console.error('Error loading songs:', error);
      toast.error(error.message || 'Failed to load songs. Make sure you have connected Spotify or YouTube.');
    } finally {
      setLoadingSongs(false);
    }
  };

  const handleCurateSong = async (song, status, reason = null) => {
    if (!curatingCommunity) return;

    try {
      const response = await fetch(`/api/communities/${curatingCommunity.id}/curate-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: song.id,
          playlist_link_index: song.playlist_link_index,
          status: status,
          removal_reason: reason || (status === 'removed' ? 'vulgar' : null),
          song_title: song.title,
          song_artist: song.artist,
          song_thumbnail: song.thumbnail,
          song_duration: song.duration,
          platform: song.platform
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to curate song');
      }

      toast.success(status === 'approved' ? 'Song approved' : 'Song removed');
      
      // Update local state
      setSongs(songs.map(s => 
        s.id === song.id && s.playlist_link_index === song.playlist_link_index
          ? { ...s, curation_status: status, removal_reason: reason || null }
          : s
      ));
    } catch (error) {
      console.error('Error curating song:', error);
      toast.error(error.message || 'Failed to curate song');
    }
  };

  const filteredSongs = songs.filter(song => {
    if (filterStatus === 'all') return true;
    return song.curation_status === filterStatus;
  });

  // Filter communities by search query
  const filteredCommunities = communities.filter(community => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      community.name?.toLowerCase().includes(query) ||
      community.description?.toLowerCase().includes(query) ||
      community.playlist_links?.some(link => 
        link.label?.toLowerCase().includes(query) ||
        link.url?.toLowerCase().includes(query)
      )
    );
  });

  const startInlineEdit = (community) => {
    setEditingInline(community.id);
    setInlineName(community.name || '');
    setInlineDescription(community.description || '');
  };

  const cancelInlineEdit = () => {
    setEditingInline(null);
    setInlineName('');
    setInlineDescription('');
  };

  const saveInlineEdit = async (community) => {
    if (!inlineName.trim()) {
      toast.error('Community name is required');
      return;
    }

    try {
      const response = await fetch(`/api/communities/${community.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inlineName.trim(),
          description: inlineDescription.trim() || null,
          member_count: 0,
          group_count: 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update community');
      }

      toast.success('Community updated');
      setEditingInline(null);
      loadCommunities();
    } catch (error) {
      console.error('Error updating community:', error);
      toast.error(error.message || 'Failed to update community');
    }
  };

  const toggleCommunitySelection = (communityId) => {
    setSelectedCommunities(prev => 
      prev.includes(communityId)
        ? prev.filter(id => id !== communityId)
        : [...prev, communityId]
    );
  };

  const selectAllCommunities = () => {
    if (selectedCommunities.length === filteredCommunities.length) {
      setSelectedCommunities([]);
    } else {
      setSelectedCommunities(filteredCommunities.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCommunities.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCommunities.length} community/communities?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const deletePromises = selectedCommunities.map(id =>
        fetch(`/api/communities/${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      toast.success(`${selectedCommunities.length} community/communities deleted`);
      setSelectedCommunities([]);
      setShowBulkActions(false);
      loadCommunities();
    } catch (error) {
      console.error('Error deleting communities:', error);
      toast.error('Failed to delete some communities');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportCommunities = () => {
    const dataStr = JSON.stringify(communities, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `communities-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Communities exported');
  };

  const handleImportCommunities = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid file format');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const community of imported) {
        try {
          const response = await fetch('/api/communities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: community.name,
              description: community.description,
              member_count: community.member_count || 0,
              group_count: community.group_count || 0,
              playlist_links: community.playlist_links || []
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      toast.success(`Imported ${successCount} communities${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      loadCommunities();
    } catch (error) {
      console.error('Error importing communities:', error);
      toast.error('Failed to import communities. Please check the file format.');
    }

    // Reset file input
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Communities Admin</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Manage communities and their playlist links
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportCommunities}
              className="hidden"
              id="import-communities-input"
            />
            <button
              type="button"
              onClick={() => document.getElementById('import-communities-input')?.click()}
              className="glass-card flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border border-[var(--glass-border)] hover:bg-[var(--glass-border-hover)] active:bg-[var(--glass-border-hover)] text-[var(--foreground)]"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          </label>
          <button
            type="button"
            onClick={exportCommunities}
            className="glass-card flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border border-[var(--glass-border)] hover:bg-[var(--glass-border-hover)] active:bg-[var(--glass-border-hover)] text-[var(--foreground)]"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={openCreateDialog}
            className="glass-card flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border border-[var(--glass-border)] hover:bg-[var(--glass-border-hover)] active:bg-[var(--glass-border-hover)] text-[var(--foreground)] bg-white/10 hover:bg-white/20 [data-theme='light']:bg-black/5 [data-theme='light']:hover:bg-black/10"
          >
            <Plus className="h-4 w-4" />
            Create Community
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        {selectedCommunities.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted-foreground)]">
              {selectedCommunities.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCommunities([]);
                setShowBulkActions(false);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {communities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)]">No communities yet</p>
            <Button onClick={openCreateDialog} className="mt-4">
              Create your first community
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Music className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <p className="text-[var(--muted-foreground)]">
                {searchQuery ? 'No communities match your search' : 'No communities found'}
              </p>
            </div>
          ) : (
            filteredCommunities.map((community) => (
              <Card 
                key={community.id} 
                className={`glass-card ${selectedCommunities.includes(community.id) ? 'ring-2 ring-purple-500' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCommunities.includes(community.id)}
                      onChange={() => toggleCommunitySelection(community.id)}
                      className="mt-1 w-4 h-4 rounded border-[var(--glass-border)]"
                    />
                    <div className="flex-1 min-w-0">
                      {editingInline === community.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={inlineName}
                            onChange={(e) => setInlineName(e.target.value)}
                            className="w-full px-2 py-1 bg-[var(--background)] border border-[var(--glass-border)] rounded text-[var(--foreground)] text-lg font-semibold"
                            placeholder="Community name"
                          />
                            <textarea
                              value={inlineDescription}
                              onChange={(e) => setInlineDescription(e.target.value)}
                              className="w-full px-2 py-1 bg-[var(--background)] border border-[var(--glass-border)] rounded text-[var(--foreground)] text-sm resize-none"
                              placeholder="Description"
                              rows={2}
                            />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveInlineEdit(community)}
                              className="flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelInlineEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="flex items-start justify-between">
                            <span className="flex-1 truncate">{community.name}</span>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startInlineEdit(community)}
                                className="h-7 w-7 p-0"
                                title="Quick edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(community)}
                                className="h-7 w-7 p-0"
                                title="Full edit"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(community)}
                                disabled={isDeleting}
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardTitle>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {editingInline !== community.id && (
                  <CardContent className="space-y-3">
                    {community.description && (
                      <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
                        {community.description}
                      </p>
                    )}
                <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                  <span>
                    {community.playlist_links?.length > 0 
                      ? `${community.playlist_links.length} playlist${community.playlist_links.length !== 1 ? 's' : ''}`
                      : 'No playlists'
                    }
                  </span>
                </div>
                {community.playlist_links && community.playlist_links.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">Playlist Links:</p>
                    {community.playlist_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">
                          {link.label || `${link.platform} playlist`}
                        </span>
                      </a>
                    ))}
                    <Button
                      onClick={() => openCurationDialog(community)}
                      className="w-full mt-2 flex items-center gap-2"
                      variant="outline"
                      size="sm"
                    >
                      <Filter className="h-4 w-4" />
                      Curate Songs
                    </Button>
                  </div>
                )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Curation Dialog */}
      <Dialog open={isCurationDialogOpen} onOpenChange={setIsCurationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Curate Songs - {curatingCommunity?.name}
            </DialogTitle>
            <DialogDescription>
              Review and filter songs from playlist links. Remove vulgar or inappropriate content.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--muted-foreground)]">Filter:</span>
              {['all', 'pending', 'approved', 'removed'].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => curatingCommunity && loadSongs(curatingCommunity.id)}
                className="ml-auto flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {loadingSongs ? (
              <div className="text-center py-12">
                <p className="text-[var(--muted-foreground)]">Loading songs...</p>
              </div>
            ) : filteredSongs.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)]">
                  {songs.length === 0 
                    ? 'No songs found. Make sure you have connected Spotify or YouTube and the playlist links are valid.'
                    : `No songs with status: ${filterStatus}`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSongs.map((song, idx) => (
                  <Card key={`${song.id}-${song.playlist_link_index}-${idx}`} className="p-4">
                    <div className="flex items-start gap-4">
                      {song.thumbnail && (
                        <img
                          src={song.thumbnail}
                          alt={song.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-[var(--foreground)] truncate">
                              {song.title}
                            </h4>
                            <p className="text-sm text-[var(--muted-foreground)] truncate">
                              {song.artist}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--muted-foreground)]">
                                {song.playlist_label}
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)]">•</span>
                              <span className="text-xs text-[var(--muted-foreground)] capitalize">
                                {song.platform}
                              </span>
                              {song.explicit && (
                                <>
                                  <span className="text-xs text-[var(--muted-foreground)]">•</span>
                                  <span className="text-xs text-red-400">Explicit</span>
                                </>
                              )}
                            </div>
                            {song.curation_status !== 'pending' && (
                              <div className="mt-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  song.curation_status === 'approved'
                                    ? 'bg-green-900/30 text-green-400'
                                    : 'bg-red-900/30 text-red-400'
                                }`}>
                                  {song.curation_status === 'approved' ? 'Approved' : `Removed: ${song.removal_reason || 'vulgar'}`}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {song.curation_status !== 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCurateSong(song, 'approved')}
                                className="flex items-center gap-2 text-green-400 hover:text-green-300"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                            )}
                            {song.curation_status !== 'removed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCurateSong(song, 'removed', 'vulgar')}
                                className="flex items-center gap-2 text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                                Remove
                              </Button>
                            )}
                            {song.curation_status !== 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCurateSong(song, 'pending')}
                                className="text-xs"
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCommunity ? 'Edit Community' : 'Create Community'}
            </DialogTitle>
            <DialogDescription>
              {editingCommunity 
                ? 'Update community details and playlist links'
                : 'Create a new community with playlist links'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <TextField
              id="name"
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Community name"
              required
            />

            <TextareaField
              id="description"
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Community description"
              maxLength={500}
            />


            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Playlist Links
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPlaylistLink}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Link
                </Button>
              </div>

              {playlistLinks.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                  No playlist links. Click "Add Link" to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {playlistLinks.map((link, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            Link {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePlaylistLink(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                              Platform
                            </label>
                            <select
                              value={link.platform}
                              onChange={(e) => updatePlaylistLink(index, 'platform', e.target.value)}
                              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-md text-[var(--foreground)]"
                            >
                              <option value="spotify">Spotify</option>
                              <option value="youtube">YouTube</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                              Label (optional)
                            </label>
                            <input
                              type="text"
                              value={link.label || ''}
                              onChange={(e) => updatePlaylistLink(index, 'label', e.target.value)}
                              placeholder="e.g., Weekly Mix"
                              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-md text-[var(--foreground)]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                            URL *
                          </label>
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updatePlaylistLink(index, 'url', e.target.value)}
                            placeholder="https://open.spotify.com/playlist/..."
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-md text-[var(--foreground)]"
                            required
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingCommunity ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

