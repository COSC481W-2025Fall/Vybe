'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { TextField, TextareaField } from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, Edit, Trash2, ExternalLink, Music, Check, X, Filter, RefreshCw, 
  Search, Save, Copy, Download, Upload, MoreVertical, Lock, Sparkles,
  ListMusic, Users, LogOut, ChevronRight, Globe, CheckCircle2, XCircle,
  Clock, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// Admin password
const ADMIN_PASSWORD = 'Te@m_Vybe-2O25!';
const AUTH_KEY = 'vybe_admin_auth';

export default function AdminCommunitiesPage() {
  const router = useRouter();
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCommunity, setEditingCommunity] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [curatingCommunity, setCuratingCommunity] = useState(null);
  const [isCurationDialogOpen, setIsCurationDialogOpen] = useState(false);
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingInline, setEditingInline] = useState(null);
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [playlistLinks, setPlaylistLinks] = useState([]);
  
  // Inline edit state
  const [inlineName, setInlineName] = useState('');
  const [inlineDescription, setInlineDescription] = useState('');

  useEffect(() => {
    const storedAuth = sessionStorage.getItem(AUTH_KEY);
    if (storedAuth === 'true') {
      setIsAdminAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthed) {
      checkAuth();
      loadCommunities();
    }
  }, [isAdminAuthed]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthed(true);
      sessionStorage.setItem(AUTH_KEY, 'true');
      setPasswordError('');
      toast.success('Welcome to Admin Dashboard');
    } else {
      setPasswordError('Incorrect password');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAdminAuthed(false);
    sessionStorage.removeItem(AUTH_KEY);
    toast.success('Logged out');
  };

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
      if (!response.ok) throw new Error(data.error || 'Failed to load');
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
      toast.error('Name is required');
      return;
    }

    try {
      const url = editingCommunity 
        ? `/api/communities/${editingCommunity.id}`
        : '/api/communities';
      
      const response = await fetch(url, {
        method: editingCommunity ? 'PUT' : 'POST',
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
      if (!response.ok) throw new Error(data.error || 'Failed to save');

      toast.success(editingCommunity ? 'Updated!' : 'Created!');
      setIsDialogOpen(false);
      loadCommunities();
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleDelete = async (community) => {
    if (!confirm(`Delete "${community.name}"?`)) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/communities/${community.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success('Deleted');
      loadCommunities();
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
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
      if (!response.ok) throw new Error(data.error);
      setSongs(data.songs || []);
    } catch (error) {
      toast.error('Failed to load songs');
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
          status,
          removal_reason: reason || (status === 'removed' ? 'vulgar' : null),
          song_title: song.title,
          song_artist: song.artist,
          song_thumbnail: song.thumbnail,
          song_duration: song.duration,
          platform: song.platform
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(status === 'approved' ? 'Approved' : 'Removed');
      setSongs(songs.map(s => 
        s.id === song.id && s.playlist_link_index === song.playlist_link_index
          ? { ...s, curation_status: status, removal_reason: reason || null }
          : s
      ));
    } catch (error) {
      toast.error('Failed to curate');
    }
  };

  const filteredSongs = songs.filter(song => {
    const matchesStatus = filterStatus === 'all' || song.curation_status === filterStatus;
    const matchesSearch = !songSearchQuery.trim() || 
      song.title?.toLowerCase().includes(songSearchQuery.toLowerCase()) ||
      song.artist?.toLowerCase().includes(songSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Song selection helpers
  const getSongKey = (song) => `${song.id}-${song.playlist_link_index}`;
  
  const toggleSongSelection = (song) => {
    const key = getSongKey(song);
    setSelectedSongs(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllFilteredSongs = () => {
    const allKeys = filteredSongs.map(getSongKey);
    if (selectedSongs.length === filteredSongs.length) {
      setSelectedSongs([]);
    } else {
      setSelectedSongs(allKeys);
    }
  };

  const clearSongSelection = () => setSelectedSongs([]);

  // Bulk operations
  const handleBulkCurate = async (status, reason = null) => {
    if (selectedSongs.length === 0 || !curatingCommunity) return;
    
    setBulkProcessing(true);
    let success = 0;
    let failed = 0;

    for (const key of selectedSongs) {
      const song = songs.find(s => getSongKey(s) === key);
      if (!song) continue;

      try {
        const response = await fetch(`/api/communities/${curatingCommunity.id}/curate-song`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            song_id: song.id,
            playlist_link_index: song.playlist_link_index,
            status,
            removal_reason: reason || (status === 'removed' ? 'vulgar' : null),
            song_title: song.title,
            song_artist: song.artist,
            song_thumbnail: song.thumbnail,
            song_duration: song.duration,
            platform: song.platform
          })
        });
        if (response.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    // Update local state
    setSongs(prev => prev.map(s => {
      if (selectedSongs.includes(getSongKey(s))) {
        return { ...s, curation_status: status, removal_reason: reason || null };
      }
      return s;
    }));

    setSelectedSongs([]);
    setBulkProcessing(false);
    
    if (failed > 0) {
      toast.success(`${success} songs ${status}, ${failed} failed`);
    } else {
      toast.success(`${success} songs ${status}`);
    }
  };

  const handleApproveAllPending = async () => {
    if (!curatingCommunity) return;
    
    const pendingSongs = songs.filter(s => s.curation_status === 'pending');
    if (pendingSongs.length === 0) {
      toast.info('No pending songs to approve');
      return;
    }

    setBulkProcessing(true);
    let success = 0;

    for (const song of pendingSongs) {
      try {
        const response = await fetch(`/api/communities/${curatingCommunity.id}/curate-song`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            song_id: song.id,
            playlist_link_index: song.playlist_link_index,
            status: 'approved',
            removal_reason: null,
            song_title: song.title,
            song_artist: song.artist,
            song_thumbnail: song.thumbnail,
            song_duration: song.duration,
            platform: song.platform
          })
        });
        if (response.ok) success++;
      } catch {
        // Continue on error
      }
    }

    setSongs(prev => prev.map(s => 
      s.curation_status === 'pending' ? { ...s, curation_status: 'approved' } : s
    ));

    setBulkProcessing(false);
    toast.success(`Approved ${success} songs`);
  };

  const handleResetAllToStatus = async (targetStatus) => {
    if (!curatingCommunity) return;
    
    const songsToReset = songs.filter(s => s.curation_status !== targetStatus);
    if (songsToReset.length === 0) {
      toast.info(`All songs are already ${targetStatus}`);
      return;
    }

    setBulkProcessing(true);
    let success = 0;

    for (const song of songsToReset) {
      try {
        const response = await fetch(`/api/communities/${curatingCommunity.id}/curate-song`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            song_id: song.id,
            playlist_link_index: song.playlist_link_index,
            status: targetStatus,
            removal_reason: null,
            song_title: song.title,
            song_artist: song.artist,
            song_thumbnail: song.thumbnail,
            song_duration: song.duration,
            platform: song.platform
          })
        });
        if (response.ok) success++;
      } catch {
        // Continue
      }
    }

    setSongs(prev => prev.map(s => ({ ...s, curation_status: targetStatus, removal_reason: null })));
    setBulkProcessing(false);
    toast.success(`Reset ${success} songs to ${targetStatus}`);
  };

  // Stats for curation
  const songStats = {
    total: songs.length,
    pending: songs.filter(s => s.curation_status === 'pending').length,
    approved: songs.filter(s => s.curation_status === 'approved').length,
    removed: songs.filter(s => s.curation_status === 'removed').length,
  };

  const filteredCommunities = communities.filter(community => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      community.name?.toLowerCase().includes(query) ||
      community.description?.toLowerCase().includes(query)
    );
  });

  const startInlineEdit = (community) => {
    setEditingInline(community.id);
    setInlineName(community.name || '');
    setInlineDescription(community.description || '');
  };

  const cancelInlineEdit = () => {
    setEditingInline(null);
  };

  const saveInlineEdit = async (community) => {
    if (!inlineName.trim()) {
      toast.error('Name required');
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

      if (!response.ok) throw new Error('Failed to update');
      toast.success('Saved');
      setEditingInline(null);
      loadCommunities();
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const toggleCommunitySelection = (communityId) => {
    setSelectedCommunities(prev => 
      prev.includes(communityId)
        ? prev.filter(id => id !== communityId)
        : [...prev, communityId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedCommunities.length === 0) return;
    if (!confirm(`Delete ${selectedCommunities.length} communities?`)) return;

    try {
      setIsDeleting(true);
      await Promise.all(selectedCommunities.map(id =>
        fetch(`/api/communities/${id}`, { method: 'DELETE' })
      ));
      toast.success('Deleted');
      setSelectedCommunities([]);
      loadCommunities();
    } catch (error) {
      toast.error('Some deletions failed');
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
    toast.success('Exported');
  };

  const handleImportCommunities = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error('Invalid format');

      let success = 0;
      for (const community of imported) {
        const response = await fetch('/api/communities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: community.name,
            description: community.description,
            member_count: 0,
            group_count: 0,
            playlist_links: community.playlist_links || []
          })
        });
        if (response.ok) success++;
      }

      toast.success(`Imported ${success} communities`);
      loadCommunities();
    } catch (error) {
      toast.error('Import failed');
    }
    event.target.value = '';
  };

  // Password Screen
  if (!isAdminAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[var(--accent)]/20 via-[var(--background)] to-pink-900/20">
        <div className="w-full max-w-md">
          {/* Logo/Brand Area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-pink-500 mb-4 shadow-lg" style={{ boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--accent) 25%, transparent)' }}>
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Vybe Admin</h1>
            <p className="text-[var(--muted-foreground)] mt-2">Communities Management</p>
          </div>

          {/* Login Card */}
          <div className="glass-card rounded-2xl p-8 border border-[var(--accent)]/20">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-12 pr-4 py-4 bg-[var(--background)] border-2 border-[var(--glass-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                    autoFocus
                  />
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-[var(--accent)] to-pink-600 hover:opacity-90 text-white rounded-xl font-semibold transition-all shadow-lg"
                style={{ boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--accent) 25%, transparent)' }}
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/20 animate-pulse">
            <Music className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <p className="text-[var(--muted-foreground)]">Loading communities...</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalPlaylists = communities.reduce((acc, c) => acc + (c.playlist_links?.length || 0), 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] bg-[var(--background)]/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--accent)] to-pink-500 shadow-lg" style={{ boxShadow: '0 10px 25px -5px color-mix(in srgb, var(--accent) 20%, transparent)' }}>
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Our Playlists Admin</h1>
                <p className="text-sm text-[var(--muted-foreground)]">Manage curated playlists</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary-bg)] rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 border-l-4 border-l-[var(--accent)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent)]/20">
                <Globe className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{communities.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Communities</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-l-pink-500">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <ListMusic className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{totalPlaylists}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Playlists</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-l-green-500">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{selectedCommunities.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Selected</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">Live</p>
                <p className="text-xs text-[var(--muted-foreground)]">Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCommunities.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition-colors border border-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedCommunities.length})
                </button>
              )}
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportCommunities}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-lg font-medium transition-colors border border-[var(--glass-border)]">
                  <Upload className="h-4 w-4" />
                  Import
                </div>
              </label>
              
              <button
                onClick={exportCommunities}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] text-[var(--foreground)] rounded-lg font-medium transition-colors border border-[var(--glass-border)]"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              
              <button
                onClick={openCreateDialog}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--accent)] to-pink-600 hover:opacity-90 text-white rounded-lg font-medium transition-all shadow-lg shadow-[var(--accent)]/20"
              >
                <Plus className="h-4 w-4" />
                New Community
              </button>
            </div>
          </div>
        </div>

        {/* Communities Grid */}
        {communities.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--accent)]/10 mb-6">
              <Music className="h-10 w-10 text-[var(--accent)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">No communities yet</h3>
            <p className="text-[var(--muted-foreground)] mb-6">Create your first community to get started</p>
            <button
              onClick={openCreateDialog}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-pink-600 text-white rounded-xl font-medium"
            >
              <Plus className="h-5 w-5" />
              Create Community
            </button>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Search className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)]">No communities match "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCommunities.map((community) => (
              <div
                key={community.id}
                className={`glass-card rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                  selectedCommunities.includes(community.id) 
                    ? 'ring-2 ring-[var(--accent)] shadow-[var(--accent)]/20' 
                    : 'hover:border-[var(--accent)]/30'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--accent)]/5 to-pink-500/5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCommunities.includes(community.id)}
                      onChange={() => toggleCommunitySelection(community.id)}
                      className="mt-1 w-4 h-4 rounded border-[var(--glass-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    
                    {editingInline === community.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={inlineName}
                          onChange={(e) => setInlineName(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--accent)]/50 rounded-lg text-[var(--foreground)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                        />
                        <textarea
                          value={inlineDescription}
                          onChange={(e) => setInlineDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                          rows={2}
                          placeholder="Description..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveInlineEdit(community)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent)] hover:opacity-80 text-white text-sm rounded-lg"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-[var(--foreground)] truncate">{community.name}</h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => startInlineEdit(community)}
                              className="p-1.5 hover:bg-[var(--secondary-bg)] rounded-lg transition-colors"
                              title="Quick edit"
                            >
                              <Edit className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                            </button>
                            <button
                              onClick={() => openEditDialog(community)}
                              className="p-1.5 hover:bg-[var(--secondary-bg)] rounded-lg transition-colors"
                              title="Full edit"
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                            </button>
                            <button
                              onClick={() => handleDelete(community)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                        {community.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">
                            {community.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                {editingInline !== community.id && (
                  <div className="p-4 space-y-3">
                    {/* Playlists Count */}
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <ListMusic className="h-4 w-4" />
                      <span>
                        {community.playlist_links?.length || 0} playlist{(community.playlist_links?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Playlist Links */}
                    {community.playlist_links?.length > 0 && (
                      <div className="space-y-2">
                        {community.playlist_links.slice(0, 2).map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] rounded-lg text-sm transition-colors group"
                          >
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${
                              link.platform === 'spotify' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {link.platform === 'spotify' ? (
                                <Music className="h-3 w-3 text-green-400" />
                              ) : (
                                <Music className="h-3 w-3 text-red-400" />
                              )}
                            </div>
                            <span className="flex-1 truncate text-[var(--foreground)]">
                              {link.label || `${link.platform} playlist`}
                            </span>
                            <ExternalLink className="h-3 w-3 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]" />
                          </a>
                        ))}
                        {community.playlist_links.length > 2 && (
                          <p className="text-xs text-[var(--muted-foreground)] text-center">
                            +{community.playlist_links.length - 2} more
                          </p>
                        )}
                      </div>
                    )}

                    {/* Curate Button */}
                    {community.playlist_links?.length > 0 && (
                      <button
                        onClick={() => openCurationDialog(community)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-sm font-medium transition-colors border border-[var(--accent)]/20"
                      >
                        <Filter className="h-4 w-4" />
                        Curate Songs
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curation Dialog */}
      <Dialog open={isCurationDialogOpen} onOpenChange={(open) => {
        setIsCurationDialogOpen(open);
        if (!open) {
          setSelectedSongs([]);
          setSongSearchQuery('');
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[var(--accent)]" />
              Curate Songs - {curatingCommunity?.name}
            </DialogTitle>
            <DialogDescription>
              Select songs with checkboxes, then use bulk actions. Or use quick actions on the right.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Stats Bar */}
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--glass-border)] mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--secondary-bg)] rounded-lg">
                <Music className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">{songStats.total}</span>
                <span className="text-xs text-[var(--muted-foreground)]">total</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">{songStats.pending}</span>
                <span className="text-xs text-yellow-400/70">pending</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">{songStats.approved}</span>
                <span className="text-xs text-green-400/70">approved</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{songStats.removed}</span>
                <span className="text-xs text-red-400/70">removed</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 pb-3 border-b border-[var(--glass-border)] mb-3">
              {/* Search & Filter */}
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    placeholder="Search songs..."
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  />
                </div>
                <div className="flex items-center gap-1 bg-[var(--secondary-bg)] rounded-lg p-1">
                  {['all', 'pending', 'approved', 'removed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        filterStatus === status
                          ? status === 'approved' ? 'bg-green-500 text-white' 
                            : status === 'removed' ? 'bg-red-500 text-white'
                            : status === 'pending' ? 'bg-yellow-500 text-black'
                            : 'bg-[var(--accent)] text-white'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApproveAllPending}
                  disabled={bulkProcessing || songStats.pending === 0}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 rounded-lg text-sm font-medium transition-colors border border-green-500/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve All Pending
                </button>
                <button
                  onClick={() => handleResetAllToStatus('pending')}
                  disabled={bulkProcessing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] disabled:opacity-50 text-[var(--muted-foreground)] rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset All
                </button>
                <button
                  onClick={() => curatingCommunity && loadSongs(curatingCommunity.id)}
                  disabled={loadingSongs}
                  className="p-2 hover:bg-[var(--secondary-bg)] rounded-lg text-[var(--muted-foreground)] transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingSongs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Selection Actions Bar */}
            {selectedSongs.length > 0 && (
              <div className="flex items-center gap-3 pb-3 mb-3 bg-[var(--accent)]/10 -mx-6 px-6 py-3 border-y border-[var(--accent)]/20">
                <span className="text-sm font-medium text-[var(--accent)]">
                  {selectedSongs.length} selected
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => handleBulkCurate('approved')}
                    disabled={bulkProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBulkCurate('removed', 'vulgar')}
                    disabled={bulkProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Remove Selected
                  </button>
                  <button
                    onClick={() => handleBulkCurate('pending')}
                    disabled={bulkProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--secondary-hover)] disabled:opacity-50 text-[var(--foreground)] rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset to Pending
                  </button>
                  <button
                    onClick={clearSongSelection}
                    className="p-2 hover:bg-[var(--secondary-bg)] rounded-lg text-[var(--muted-foreground)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Song List */}
            <div className="flex-1 overflow-y-auto modal-scroll">
              {loadingSongs ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent)]/20 animate-pulse mb-4">
                    <Music className="h-6 w-6 text-[var(--accent)]" />
                  </div>
                  <p className="text-[var(--muted-foreground)]">Loading songs...</p>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                  <p className="text-[var(--muted-foreground)]">
                    {songs.length === 0 ? 'No songs found' : songSearchQuery ? 'No songs match your search' : `No ${filterStatus} songs`}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Select All Header */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-[var(--secondary-bg)] rounded-lg mb-2 sticky top-0 z-10">
                    <input
                      type="checkbox"
                      checked={selectedSongs.length === filteredSongs.length && filteredSongs.length > 0}
                      onChange={selectAllFilteredSongs}
                      className="w-4 h-4 rounded border-[var(--glass-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {selectedSongs.length === filteredSongs.length ? 'Deselect all' : 'Select all'} ({filteredSongs.length} songs)
                    </span>
                  </div>

                  {filteredSongs.map((song, idx) => {
                    const isSelected = selectedSongs.includes(getSongKey(song));
                    return (
                      <div 
                        key={`${song.id}-${song.playlist_link_index}-${idx}`} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:border-[var(--accent)]/30 ${
                          isSelected 
                            ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/20'
                            : song.curation_status === 'approved' 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : song.curation_status === 'removed'
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-[var(--secondary-bg)] border-[var(--glass-border)]'
                        }`}
                        onClick={() => toggleSongSelection(song)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-[var(--glass-border)] text-[var(--accent)] focus:ring-[var(--accent)] pointer-events-none"
                        />
                        {song.thumbnail && (
                          <img
                            src={song.thumbnail}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[var(--foreground)] truncate text-sm">{song.title}</h4>
                          <p className="text-xs text-[var(--muted-foreground)] truncate">{song.artist}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              song.platform === 'spotify' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {song.platform}
                            </span>
                            {song.explicit && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">E</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              song.curation_status === 'approved' 
                                ? 'bg-green-500/20 text-green-400' 
                                : song.curation_status === 'removed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {song.curation_status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {song.curation_status !== 'approved' && (
                            <button
                              onClick={() => handleCurateSong(song, 'approved')}
                              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {song.curation_status !== 'removed' && (
                            <button
                              onClick={() => handleCurateSong(song, 'removed', 'vulgar')}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          {song.curation_status !== 'pending' && (
                            <button
                              onClick={() => handleCurateSong(song, 'pending')}
                              className="p-1.5 rounded-lg hover:bg-[var(--secondary-hover)] text-[var(--muted-foreground)] transition-colors"
                              title="Reset"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto modal-scroll">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCommunity ? <Edit className="h-5 w-5 text-[var(--accent)]" /> : <Plus className="h-5 w-5 text-[var(--accent)]" />}
              {editingCommunity ? 'Edit Community' : 'Create Community'}
            </DialogTitle>
            <DialogDescription>
              {editingCommunity ? 'Update details and playlists' : 'Add a new curated playlist collection'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Chill Vibes"
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--glass-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this collection special?"
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--glass-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>

            {/* Playlist Links */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--foreground)]">Playlist Links</label>
                <button
                  type="button"
                  onClick={addPlaylistLink}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--accent)] hover:opacity-80 hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Link
                </button>
              </div>

              {playlistLinks.length === 0 ? (
                <div className="text-center py-8 bg-[var(--secondary-bg)] rounded-xl border-2 border-dashed border-[var(--glass-border)]">
                  <ListMusic className="h-8 w-8 text-[var(--muted-foreground)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">No playlists added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {playlistLinks.map((link, index) => (
                    <div key={index} className="p-4 bg-[var(--secondary-bg)] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--foreground)]">Playlist {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removePlaylistLink(index)}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[var(--muted-foreground)] mb-1">Platform</label>
                          <select
                            value={link.platform}
                            onChange={(e) => updatePlaylistLink(index, 'platform', e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                          >
                            <option value="spotify">Spotify</option>
                            <option value="youtube">YouTube</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted-foreground)] mb-1">Label</label>
                          <input
                            type="text"
                            value={link.label || ''}
                            onChange={(e) => updatePlaylistLink(index, 'label', e.target.value)}
                            placeholder="e.g., Weekly Mix"
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-[var(--muted-foreground)] mb-1">URL *</label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updatePlaylistLink(index, 'url', e.target.value)}
                          placeholder="https://open.spotify.com/playlist/..."
                          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--glass-border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--glass-border)]">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-6 py-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-gradient-to-r from-[var(--accent)] to-pink-600 hover:opacity-90 text-white rounded-xl font-medium transition-all shadow-lg shadow-[var(--accent)]/20"
              >
                {editingCommunity ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
