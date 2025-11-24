
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';
import { Clock, ListMusic } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ---------------- helpers ----------------
function timeAgo(input) {
  const date = new Date(input);
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

function TabButton({ isActive, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-sm transition',
        isActive
          ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm font-medium'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--glass-border)]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Row({ item }) {
  return (
    <li className="group relative flex items-center gap-3 sm:gap-5 rounded-xl px-3 sm:px-5 py-3 sm:py-5 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 active:bg-white/10 [data-theme='light']:active:bg-black/10 transition-all duration-300 border border-white/10 [data-theme='light']:border-black/10 hover:border-white/20 [data-theme='light']:hover:border-black/20 active:border-white/20 [data-theme='light']:active:border-black/20 backdrop-blur-sm glass-card">
      <div className="relative flex-shrink-0">
        <img
          src={item.cover}
          width={64}
          height={64}
          className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl object-cover shadow-xl group-hover:shadow-2xl transition-all duration-300"
          alt={`${item.title} cover`}
        />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm sm:text-base md:text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--foreground)] transition-colors duration-300">
          {item.title}
        </div>
        <div className="truncate text-xs sm:text-sm md:text-base text-muted-foreground mt-0.5 sm:mt-1">
          {item.artist}
        </div>
        <div className="truncate text-xs sm:text-sm text-muted-foreground/80 mt-0.5 sm:mt-1">
          {item.album}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-[var(--muted-foreground)] bg-white/10 [data-theme='light']:bg-black/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm flex-shrink-0 border border-white/10 [data-theme='light']:border-black/10">
        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="font-medium whitespace-nowrap">{timeAgo(item.playedAt)}</span>
      </div>
    </li>
  );
}

function PlaylistRow({ playlist }) {
  const [exporting, setExporting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  async function handleExport() {
    try {
      setExporting(true);
      // Ask the user for a custom playlist name to create on their Spotify account
      const name = window.prompt('Enter a name for the new Spotify playlist:', playlist.name || 'Vybe playlist');
      if (!name) {
        setExporting(false);
        return;
      }

      const res = await fetch('/api/spotify/create-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlist.id, newPlaylistName: name }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Export failed: ${res.status} ${text}`);
      }

      const json = await res.json();
      if (!json.success || !json.playlist) throw new Error(json.error || 'Invalid response');

      // Open the created playlist in a new tab and inform the user
      if (json.playlist.url) {
        window.open(json.playlist.url, '_blank');
        alert('Playlist created on Spotify: it should open in a new tab.');
      } else {
        alert('Playlist created on Spotify.');
      }
    } catch (err) {
      console.error('Export error', err);
      alert(String(err?.message || err));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCSV() {
    try {
      setExportingCSV(true);
      const res = await fetch('/api/export-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlist.id }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Export failed: ${res.status} ${text}`);
      }

      const json = await res.json();
      if (!json.success || !json.playlist) throw new Error(json.error || 'Invalid response');

      // Convert ordered tracks to CSV (preserve index order)
      const tracks = json.playlist.tracks || [];
      const headers = ['order', 'id', 'title', 'artist', 'duration_seconds', 'thumbnail'];
      const rows = tracks.map((t, idx) => [
        idx + 1,
        t.id || '',
        (t.title || '').replace(/"/g, '""'),
        (t.artist || '').replace(/"/g, '""'),
        t.duration_seconds ?? '',
        t.thumbnail || '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

      const filename = `${(json.playlist.name || 'playlist').replace(/[^a-z0-9\-_\. ]/gi, '_')}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error', err);
      alert(String(err?.message || err));
    } finally {
      setExportingCSV(false);
    }
  }
  return (
    <li className="group relative flex items-center gap-3 sm:gap-5 rounded-xl px-3 sm:px-5 py-3 sm:py-5 hover:bg-white/10 [data-theme='light']:hover:bg-black/10 active:bg-white/10 [data-theme='light']:active:bg-black/10 transition-all duration-300 border border-white/10 [data-theme='light']:border-black/10 hover:border-white/20 [data-theme='light']:hover:border-black/20 active:border-white/20 [data-theme='light']:active:border-black/20 backdrop-blur-sm glass-card">
      <div className="relative flex-shrink-0">
        {playlist.cover ? (
          <img
            src={playlist.cover}
            width={64}
            height={64}
            className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl object-cover shadow-xl group-hover:shadow-2xl transition-all duration-300"
            alt={`${playlist.name} cover`}
          />
        ) : (
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl bg-white/10 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 flex items-center justify-center">
            <ListMusic className="h-6 w-6 sm:h-8 sm:w-8 text-[var(--muted-foreground)]" />
          </div>
        )}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm sm:text-base md:text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--foreground)] transition-colors duration-300">
          {playlist.name}
        </div>
        <div className="truncate text-xs sm:text-sm md:text-base text-muted-foreground mt-0.5 sm:mt-1">
          {playlist.description || 'No description'}
        </div>
        <div className="truncate text-xs sm:text-sm text-muted-foreground/80 mt-0.5 sm:mt-1">
          {playlist.tracks} tracks • by {playlist.owner}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm flex-shrink-0">
        <ListMusic className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="font-medium whitespace-nowrap">{playlist.public ? 'Public' : 'Private'}</span>
      </div>
    </li>
  );
}

// ---------------- component ----------------
const TABS = [
  { key: 'recent', label: 'Recent History' },
  { key: 'saved', label: 'Saved Playlists' },
];

export default function LibraryView() {
  const [tab, setTab] = useState('recent');

  // User identity and provider
  const [userInfo, setUserInfo] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [meError, setMeError] = useState(null);

  // Listening history
  const [recent, setRecent] = useState([]);   // normalized items for UI
  const [loadingRec, setLoadingRec] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [recError, setRecError] = useState(null);
  const [hasMore, setHasMore] = useState(true); // we stop when Spotify returns empty

  // Playlists
  const [playlists, setPlaylists] = useState([]);   // normalized playlists for UI
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistsError, setPlaylistsError] = useState(null);

  // --- load user identity based on provider ---
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: { user } } = await sb.auth.getUser();
        console.log('[Supabase user]', user);

        if (!user) {
          throw new Error('No authenticated user');
        }

        // Check which provider they used to sign in
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');

        // Get last_used_provider from database (saved during auth callback)
        const { data: userData } = await sb
          .from('users')
          .select('last_used_provider')
          .eq('id', user.id)
          .maybeSingle();

        const lastUsedProvider = userData?.last_used_provider;

        // Check user's linked identities to see which providers they have
        const identities = user.identities || [];
        const hasGoogle = identities.some(id => id.provider === 'google');
        const hasSpotify = identities.some(id => id.provider === 'spotify');

        console.log('[LibraryView] URL from parameter:', fromParam);
        console.log('[LibraryView] Last used provider from DB:', lastUsedProvider);
        console.log('[LibraryView] User identities:', identities.map(i => i.provider));
        console.log('[LibraryView] Has Google:', hasGoogle, 'Has Spotify:', hasSpotify);

        // Priority: URL parameter (just logged in) > DB saved preference
        let finalProvider = null;

        if (fromParam === 'google' || fromParam === 'spotify') {
          // They just logged in with this provider - HIGHEST PRIORITY
          finalProvider = fromParam;
          console.log('[LibraryView] Using URL parameter:', finalProvider);
        } else if (lastUsedProvider === 'google' || lastUsedProvider === 'spotify') {
          // Use saved preference from database
          finalProvider = lastUsedProvider;
          console.log('[LibraryView] Using last_used_provider from DB:', finalProvider);
        } else if (hasSpotify && !hasGoogle) {
          // Only Spotify is linked
          finalProvider = 'spotify';
          console.log('[LibraryView] Only Spotify linked');
        } else if (hasGoogle && !hasSpotify) {
          // Only Google is linked
          finalProvider = 'google';
          console.log('[LibraryView] Only Google linked');
        } else {
          // Both are linked but no preference saved - default to Spotify
          finalProvider = 'spotify';
          console.log('[LibraryView] Both providers linked, defaulting to Spotify');
        }

        console.log('[LibraryView] Final provider:', finalProvider);
        setProvider(finalProvider);

        if (finalProvider === 'spotify') {
          console.log('[LibraryView] Loading Spotify profile...');
          const res = await fetch('/api/spotify/me', { cache: 'no-store' });
          if (!res.ok) {
            let errorData = {};
            if (res && typeof res.json === 'function') {
              errorData = await res.json().catch(() => ({}));
            } else {
              const txt = await (res && typeof res.text === 'function' ? res.text().catch(() => '') : Promise.resolve(''));
              errorData = { message: txt };
            }
            const errorMessage = errorData.message || `HTTP ${res.status}`;
            // If it's a token error, provide a helpful message
            if (errorData.code === 'NO_TOKENS' || res.status === 401) {
              throw new Error(errorMessage + ' Go to Settings to connect your Spotify account.');
            }
            throw new Error(errorMessage);
          }
          const me = await parseJson(res) || null;
          setUserInfo(me);
        } else if (finalProvider === 'google') {
          console.log('[LibraryView] Setting up Google profile...');
          console.log('[LibraryView] Google user metadata:', user.user_metadata);
          setUserInfo({
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || 'Google User',
            images: user.user_metadata?.avatar_url ? [{ url: user.user_metadata.avatar_url }] : [],
            email: user.email,
          });
        } else {
          // No provider detected - user needs to connect Spotify or YouTube
          console.log('[LibraryView] No provider connected');
          setUserInfo({
            display_name: user.email?.split('@')[0] || 'User',
            images: [],
            email: user.email,
          });
        }

        setMeError(null);
      } catch (err) {
        console.error('Failed to load user profile', err);
        setMeError(String(err?.message || err));
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  // --- helper: map Spotify API -> UI row ---
  const mapItem = useCallback((sp) => {
    console.log('[mapItem] Raw Spotify item:', sp);
    const t = sp.track;
    console.log('[mapItem] Track data:', t);

    const mapped = {
      id: `${t?.id || 'unknown'}-${sp.played_at}`, // unique per play
      title: t?.name || 'Unknown',
      artist: t?.artists?.map(a => a.name).join(', ') || 'Unknown',
      album: t?.album?.name || 'Unknown',
      cover: t?.album?.images?.[1]?.url || t?.album?.images?.[0]?.url || '',
      playedAt: sp.played_at,
    };

    console.log('[mapItem] Mapped item:', mapped);
    return mapped;
  }, []);

  // --- helper: map Spotify playlist -> UI row ---
  const mapPlaylist = useCallback((playlist) => {
    console.log('[mapPlaylist] Raw Spotify playlist:', playlist);

    const mapped = {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      cover: playlist.images?.[0]?.url || '',
      tracks: playlist.tracks?.total || 0,
      owner: playlist.owner?.display_name || 'Unknown',
      public: playlist.public || false,
    };

    console.log('[mapPlaylist] Mapped playlist:', mapped);
    return mapped;
  }, []);

  // --- helper: map YouTube playlist -> UI row ---
  const mapYouTubePlaylist = useCallback((playlist) => {
    console.log('[mapYouTubePlaylist] Raw YouTube playlist:', playlist);

    const mapped = {
      id: playlist.id,
      name: playlist.snippet?.title || 'Untitled Playlist',
      description: playlist.snippet?.description || '',
      cover: playlist.snippet?.thumbnails?.high?.url || playlist.snippet?.thumbnails?.medium?.url || playlist.snippet?.thumbnails?.default?.url || '',
      tracks: playlist.contentDetails?.itemCount || 0,
      owner: playlist.snippet?.channelTitle || 'Unknown',
      public: playlist.snippet?.privacyStatus === 'public',
    };

    console.log('[mapYouTubePlaylist] Mapped playlist:', mapped);
    return mapped;
  }, []);

  // --- load first page of recently played (only for Spotify) ---
  useEffect(() => {
    (async () => {
      // Don't load data until provider is determined
      if (!provider) {
        console.log('[LibraryView] Provider not yet determined, skipping data load');
        return;
      }

      try {
        setLoadingRec(true);
        console.log('[LibraryView] Loading data for provider:', provider);

        if (provider === 'spotify') {
          console.log('[LibraryView] Loading Spotify recent plays...');
          const res = await fetch('/api/spotify/me/player/recently-played?limit=20', { cache: 'no-store' });
          if (!res.ok) {
            let errorData = {};
            if (res && typeof res.json === 'function') {
              errorData = await res.json().catch(() => ({}));
            } else {
              const txt = await (res && typeof res.text === 'function' ? res.text().catch(() => '') : Promise.resolve(''));
              errorData = { message: txt };
            }
            const errorMessage = errorData.message || `HTTP ${res.status}`;
            // If it's a token error, provide a helpful message
            if (errorData.code === 'NO_TOKENS' || res.status === 401) {
              throw new Error(errorMessage + ' Go to Settings to connect your Spotify account.');
            }
            throw new Error(errorMessage);
          }
          const json = await parseJson(res) || {};              // { items: [...], cursors, next }
          console.log('[LibraryView] Raw Spotify API response:', json);
          const items = (json.items || []).map(mapItem);
          setRecent(items);
          // Check if there's a 'next' URL to determine if more data is available
          setHasMore(!!json.next && (json.items || []).length > 0);
        } else if (provider === 'google') {
          console.log('[LibraryView] Google user - no recent plays available');
          // YouTube doesn't provide recent play history via API
          setRecent([]);
          setHasMore(false);
        } else {
          console.log('[LibraryView] Unknown provider - no data to load');
          setRecent([]);
          setHasMore(false);
        }

        setRecError(null);
      } catch (err) {
        console.error('Failed to load listening history', err);
        setRecError(String(err?.message || err));
      } finally {
        setLoadingRec(false);
      }
    })();
  }, [mapItem, provider]);

  // --- load older history (only for Spotify) ---
  const loadMore = useCallback(async () => {
    if (!recent.length || provider !== 'spotify') return;
    try {
      setMoreLoading(true);
      const oldest = recent[recent.length - 1];
      // Use the played_at timestamp as the 'before' parameter for Spotify API pagination
      const before = encodeURIComponent(oldest.playedAt);
      const url = `/api/spotify/me/player/recently-played?limit=20&before=${before}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
          let errorData = {};
          if (res && typeof res.json === 'function') {
            errorData = await res.json().catch(() => ({}));
          } else {
            const txt = await (res && typeof res.text === 'function' ? res.text().catch(() => '') : Promise.resolve(''));
            errorData = { message: txt };
          }
          const errorMessage = errorData.message || `HTTP ${res.status}`;
        // If it's a token error, provide a helpful message
        if (errorData.code === 'NO_TOKENS' || res.status === 401) {
          throw new Error(errorMessage + ' Go to Settings to connect your Spotify account.');
        }
        throw new Error(errorMessage);
      }
      const json = await parseJson(res) || {};              // { items: [...], cursors, next }
      const more = (json.items || []).map(mapItem);
      setRecent(prev => [...prev, ...more]);
      // Check if there's a 'next' URL to determine if more data is available
      setHasMore(!!json.next && (json.items || []).length > 0);
    } catch (err) {
      console.error('Load more error', err);
      setRecError(String(err?.message || err));
    } finally {
      setMoreLoading(false);
    }
  }, [recent, mapItem, provider]);

  // --- load playlists (for both Spotify and YouTube) ---
  const loadPlaylists = useCallback(async () => {
    if (provider !== 'spotify' && provider !== 'google') return;

    try {
      setLoadingPlaylists(true);

      if (provider === 'spotify') {
        console.log('[LibraryView] Loading Spotify playlists...');
        const res = await fetch('/api/spotify/me/playlists?limit=50', { cache: 'no-store' });
        if (!res.ok) {
          let errorData = {};
          if (res && typeof res.json === 'function') {
            errorData = await res.json().catch(() => ({}));
          } else {
            const txt = await (res && typeof res.text === 'function' ? res.text().catch(() => '') : Promise.resolve(''));
            errorData = { message: txt };
          }
          const errorMessage = errorData.message || `HTTP ${res.status}`;
          // If it's a token error, provide a helpful message
          if (errorData.code === 'NO_TOKENS' || res.status === 401) {
            throw new Error(errorMessage + ' Go to Settings to connect your Spotify account.');
          }
          throw new Error(errorMessage);
        }
        const json = await parseJson(res) || {};
        console.log('[LibraryView] Raw Spotify playlists response:', json);
        const items = (json.items || []).map(mapPlaylist);
        setPlaylists(items);
      } else if (provider === 'google') {
        console.log('[LibraryView] Loading YouTube playlists...');
        const res = await fetch('/api/youtube/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${body}`);
        }
        const json = await parseJson(res) || {};
        console.log('[LibraryView] Raw YouTube playlists response:', json);
        const items = (json.items || []).map(mapYouTubePlaylist);
        setPlaylists(items);
      }

      setPlaylistsError(null);
    } catch (err) {
      console.error('Failed to load playlists', err);
      setPlaylistsError(String(err?.message || err));
    } finally {
      setLoadingPlaylists(false);
    }
  }, [provider, mapPlaylist, mapYouTubePlaylist]);

  // --- load playlists when tab changes to saved ---
  useEffect(() => {
    if (tab === 'saved' && (provider === 'spotify' || provider === 'google') && playlists.length === 0 && !loadingPlaylists) {
      loadPlaylists();
    }
  }, [tab, provider, playlists.length, loadingPlaylists, loadPlaylists]);

  const content = useMemo(() => {
    // Show "connect account" message if no provider
    if (!provider) {
      return (
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl mb-20 sm:mb-40 text-[var(--foreground)]">
          <div className="relative text-center py-8 sm:py-12 md:py-16">
            <ListMusic className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-muted-foreground mx-auto mb-4 sm:mb-6" />
            <h3 className="section-title mb-2 sm:mb-3 text-lg sm:text-xl">No Music Account Connected</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-4">
              Connect your Spotify or YouTube account in Settings to view your library
            </p>
            <a
              href="/settings"
              className="inline-block px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--foreground)] hover:bg-[var(--muted-foreground)] text-[var(--background)] rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Go to Settings
            </a>
          </div>
        </div>
      );
    }

    if (tab !== 'recent') {
      return (
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl mb-20 sm:mb-40 text-[var(--foreground)]">

          <div className="relative mb-4 sm:mb-6 md:mb-8 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/10 [data-theme='light']:bg-black/5 border border-white/10 [data-theme='light']:border-black/10 rounded-lg flex-shrink-0">
              <ListMusic className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--foreground)]" />
            </div>
            <div className="min-w-0">
              <h2 className="section-title text-lg sm:text-xl">Your Playlists</h2>
              <p className="section-subtitle text-xs sm:text-sm">
                {provider === 'google' ? 'Your saved YouTube playlists' : 'Your saved Spotify playlists'}
              </p>
            </div>
          </div>

          {loadingPlaylists && (
            <div className="relative flex items-center justify-center py-8 sm:py-12 md:py-16">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]"></div>
              <span className="ml-3 sm:ml-4 text-sm sm:text-base text-muted-foreground">Loading your playlists…</span>
            </div>
          )}

          {playlistsError && (
            <div className="relative p-4 sm:p-6 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
              <p className="text-sm sm:text-base text-red-400">{playlistsError}</p>
            </div>
          )}

          {!loadingPlaylists && !playlistsError && playlists.length === 0 && (
            <div className="relative text-center py-8 sm:py-12 md:py-16">
              <ListMusic className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-muted-foreground mx-auto mb-4 sm:mb-6" />
              {provider === 'google' ? (
                <>
                  <h3 className="section-title mb-2 sm:mb-3 text-lg sm:text-xl">No playlists found</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">Create some playlists on YouTube to see them here</p>
                </>
              ) : (
                <>
                  <h3 className="section-title mb-2 sm:mb-3 text-lg sm:text-xl">No playlists found</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">Create some playlists on Spotify to see them here</p>
                </>
              )}
            </div>
          )}

          {playlists.length > 0 && (
            <ul className="space-y-2">
              {playlists.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />)}
            </ul>
          )}
        </div>
      );
    }

    return (
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl mb-20 sm:mb-40 text-[var(--foreground)]">
        <div className="relative mb-4 sm:mb-6 md:mb-8 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg flex-shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--foreground)]" />
          </div>
          <div className="min-w-0">
            <h2 className="section-title text-lg sm:text-xl">Recent Listening History</h2>
            <p className="section-subtitle text-xs sm:text-sm">Your latest musical journey</p>
          </div>
        </div>

        {loadingRec && (
          <div className="relative flex items-center justify-center py-8 sm:py-12 md:py-16">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[var(--foreground)]"></div>
            <span className="ml-3 sm:ml-4 text-sm sm:text-base text-muted-foreground">Loading your recent plays…</span>
          </div>
        )}
        {recError && (
          <div className="relative p-4 sm:p-6 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <p className="text-sm sm:text-base text-red-400">{recError}</p>
          </div>
        )}

        {!loadingRec && !recError && recent.length === 0 && (
          <div className="relative text-center py-8 sm:py-12 md:py-16">
            <Clock className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-muted-foreground mx-auto mb-4 sm:mb-6" />
            {provider === 'google' ? (
              <>
                <h3 className="section-title mb-2 sm:mb-3 text-lg sm:text-xl">No recent play history</h3>
                <p className="text-sm sm:text-base text-muted-foreground px-4">YouTube doesn't provide access to your watch history through our API</p>
              </>
            ) : (
              <>
                <h3 className="section-title mb-2 sm:mb-3 text-lg sm:text-xl">No recent plays yet</h3>
                <p className="text-sm sm:text-base text-muted-foreground px-4">Start listening to music to see your history here</p>
              </>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <>
            <ul className="space-y-2">
              {recent.map((it) => <Row key={it.id} item={it} />)}
            </ul>

            {hasMore && (
              <div className="relative mt-6 sm:mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--foreground)] hover:bg-[var(--muted-foreground)] text-[var(--background)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {moreLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-[var(--background)]"></div>
                      Loading…
                    </>
                  ) : (
                    'Load more history'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [tab, recent, loadingRec, recError, hasMore, loadMore, playlists, loadingPlaylists, playlistsError, provider]);

  return (
    <section className="mx-auto max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <header className="mb-4 sm:mb-6">
        <h1 className="page-title text-xl sm:text-2xl mb-1">Your Library</h1>
        <p className="section-subtitle text-xs sm:text-sm">Your listening history and saved playlists</p>

        {/* User identity */}
        <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 flex-wrap">
          {loadingMe && <span className="text-xs text-muted-foreground">Connecting to {provider === 'google' ? 'Google' : 'Spotify'}…</span>}
          {meError && <span className="text-xs text-red-500 break-all">{meError}</span>}
          {userInfo && (
            <>
              {userInfo.images?.[0]?.url && (
                <img
                  src={userInfo.images[0].url}
                  alt={`${provider === 'google' ? 'Google' : 'Spotify'} avatar`}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover flex-shrink-0"
                />
              )}
              <span className="text-xs sm:text-sm text-[var(--foreground)]">
                Signed in as <span className="font-medium">{userInfo.display_name}</span>
                {provider === 'google' && <span className="text-xs text-[var(--muted-foreground)] ml-1 sm:ml-2">(Google)</span>}
                {provider === 'spotify' && <span className="text-xs text-[var(--muted-foreground)] ml-1 sm:ml-2">(Spotify)</span>}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="mb-3 sm:mb-4 flex items-center gap-2 text-[var(--foreground)] overflow-x-auto modal-scroll">
        {TABS.map(({ key, label }) => (
          <TabButton key={key} isActive={tab === key} onClick={() => setTab(key)}>
            {label}
          </TabButton>
        ))}
      </div>

      {content}
    </section>
  );
}

// Robust response parser: some tests/mocks return already-parsed objects
// If `res` has a `json` method, call it and let any errors propagate
// (so callers' try/catch can handle malformed JSON). If `res` is
// already a parsed object, return it directly.
async function parseJson(res) {
  if (!res) return null;
  if (typeof res.json === 'function') return await res.json();
  return res;
}