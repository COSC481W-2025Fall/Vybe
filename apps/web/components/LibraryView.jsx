
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
          ? 'bg-white text-black shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Row({ item }) {
  return (
    <li className="group relative flex items-center gap-5 rounded-xl px-5 py-5 hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/20 backdrop-blur-sm">
      <div className="relative">
        <img
          src={item.cover}
          width={64}
          height={64}
          className="h-16 w-16 rounded-xl object-cover shadow-xl group-hover:shadow-2xl transition-all duration-300"
          alt={`${item.title} cover`}
        />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold text-white group-hover:text-yellow-400 transition-colors duration-300">
          {item.title}
        </div>
        <div className="truncate text-base text-muted-foreground mt-1">
          {item.artist}
        </div>
        <div className="truncate text-sm text-muted-foreground/80 mt-1">
          {item.album}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
        <Clock className="h-4 w-4" />
        <span className="font-medium">{timeAgo(item.playedAt)}</span>
      </div>
    </li>
  );
}

// ---------------- component ----------------
const TABS = [
  { key: 'recent', label: 'Recent History' },
  { key: 'saved',  label: 'Saved Playlists' },
];

export default function LibraryView() {
  const [tab, setTab] = useState('recent');

  // User identity and provider
  const [userInfo, setUserInfo]     = useState(null);
  const [provider, setProvider]     = useState(null);
  const [loadingMe, setLoadingMe]   = useState(true);
  const [meError, setMeError]       = useState(null);

  // Listening history
  const [recent, setRecent]         = useState([]);   // normalized items for UI
  const [loadingRec, setLoadingRec] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [recError, setRecError]     = useState(null);
  const [hasMore, setHasMore]       = useState(true); // we stop when Spotify returns empty

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

        // Check URL parameter first (takes priority)
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');
        const userProvider = user.app_metadata?.provider;
        
        // Prioritize URL parameter over metadata
        const finalProvider = fromParam === 'google' ? 'google' : 
                             fromParam === 'spotify' ? 'spotify' : 
                             userProvider;
        
        console.log('[LibraryView] Final provider:', finalProvider);
        setProvider(finalProvider);

        if (finalProvider === 'spotify') {
          console.log('[LibraryView] Loading Spotify profile...');
          const res = await fetch('/api/spotify/me', { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const me = await res.json();
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
          throw new Error(`Unknown provider: ${finalProvider}`);
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
      album:  t?.album?.name || 'Unknown',
      cover:  t?.album?.images?.[1]?.url || t?.album?.images?.[0]?.url || '',
      playedAt: sp.played_at,
    };
    
    console.log('[mapItem] Mapped item:', mapped);
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
            const body = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${body}`);
          }
          const json = await res.json();              // { items: [...], cursors, next }
          console.log('[LibraryView] Raw Spotify API response:', json);
          const items = (json.items || []).map(mapItem);
          setRecent(items);
          setHasMore((json.items || []).length > 0);
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
      const before = encodeURIComponent(oldest.playedAt);
      const url = `/api/history?limit=20&before=${before}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${body}`);
      }
      const json = await res.json();
      const more = (json.items || []).map((row) => ({
        id: `${row.track_id}-${row.played_at}`,
        title: row.title ?? row.track_name ?? 'Unknown',
        artist: row.artist ?? row.artist_name ?? 'Unknown',
        album: row.album ?? row.album_name ?? '',
        cover: row.cover_url ?? row.album_image ?? '',
        playedAt: row.played_at,
      }));
      setRecent(prev => [...prev, ...more]);
      if (!json.items || json.items.length === 0) setHasMore(false);
    } catch (err) {
      console.error('Load more error', err);
      setRecError(String(err?.message || err));
    } finally {
      setMoreLoading(false);
    }
  }, [recent, mapItem, provider]);

  const content = useMemo(() => {
    if (tab !== 'recent') {
      return (
        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur chroma-card text-white">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ListMusic className="h-4 w-4 text-muted-foreground" />
            <span>Saved Playlists</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You don’t have any saved playlists yet.
          </p>
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-black via-gray-900 to-purple-900 p-8 shadow-2xl backdrop-blur-sm mb-40 text-white">
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-purple-900/40 pointer-events-none" />
        
        <div className="relative mb-8 flex items-center gap-3">
          <div className="p-2 bg-yellow-400/20 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Listening History</h2>
            <p className="text-sm text-muted-foreground">Your latest musical journey</p>
          </div>
        </div>

        {loadingRec && (
          <div className="relative flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
            <span className="ml-4 text-base text-muted-foreground">Loading your recent plays…</span>
          </div>
        )}
        {recError && (
          <div className="relative p-6 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <p className="text-base text-red-400">{recError}</p>
          </div>
        )}

        {!loadingRec && !recError && recent.length === 0 && (
          <div className="relative text-center py-16">
            <Clock className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            {provider === 'google' ? (
              <>
                <h3 className="text-xl font-semibold text-white mb-3">No recent play history</h3>
                <p className="text-base text-muted-foreground">YouTube doesn't provide access to your watch history through our API</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white mb-3">No recent plays yet</h3>
                <p className="text-base text-muted-foreground">Start listening to music to see your history here</p>
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
              <div className="relative mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="flex items-center gap-3 rounded-full px-8 py-4 text-base bg-yellow-400 hover:bg-yellow-500 text-black font-semibold shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {moreLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
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
  }, [tab, recent, loadingRec, recError, hasMore, loadMore]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Your Library</h1>
        <p className="text-sm text-muted-foreground text-white/80">
          Your listening history and saved playlists
        </p>

          {/* User identity */}
          <div className="mt-3 flex items-center gap-3">
            {loadingMe && <span className="text-xs text-muted-foreground">Connecting to {provider === 'google' ? 'Google' : 'Spotify'}…</span>}
            {meError && <span className="text-xs text-red-500 break-all">{meError}</span>}
            {userInfo && (
              <>
                {userInfo.images?.[0]?.url && (
                  <img
                    src={userInfo.images[0].url}
                    alt={`${provider === 'google' ? 'Google' : 'Spotify'} avatar`}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm text-white">
                  Signed in as <span className="font-medium">{userInfo.display_name}</span>
                  {provider === 'google' && <span className="text-xs text-muted-foreground ml-2">(Google)</span>}
                  {provider === 'spotify' && <span className="text-xs text-muted-foreground ml-2">(Spotify)</span>}
                </span>
              </>
            )}
          </div>
      </header>

      <div className="mb-4 flex items-center gap-2 text-white">
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