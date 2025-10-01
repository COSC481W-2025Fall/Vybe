
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, ListMusic, Music, Youtube } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { getYTMusicHistory, validateYTMusicConnection } from '@/app/lib/ytmusic';

// ---------------- helpers ----------------
function timeAgo(input) {
  if (!input) return '';
  // If backend already gave us a human string (e.g., "3 minutes ago"), use it
  if (typeof input === 'string') {
    const tryDate = new Date(input);
    if (isNaN(tryDate.getTime())) return input; // non-date human string
  }

  const date = new Date(input);
  if (isNaN(date.getTime())) return '';

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

function Row({ item, service }) {
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
        {service === 'ytmusic' && (
          <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1">
            <Youtube className="h-3 w-3 text-white" />
          </div>
        )}
        {service === 'spotify' && (
          <div className="absolute -top-1 -right-1 bg-green-600 rounded-full p-1">
            <Music className="h-3 w-3 text-white" />
          </div>
        )}
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
  const [service, setService] = useState('spotify'); // 'spotify' or 'ytmusic'

  // User identity and provider
  const [userInfo, setUserInfo]     = useState(null);
  const [provider, setProvider]     = useState(null);
  const [loadingMe, setLoadingMe]   = useState(true);
  const [meError, setMeError]       = useState(null);

  // YouTube Music connection
  const [ytmusicConnected, setYtmusicConnected] = useState(false);
  const [ytmusicLoading, setYtmusicLoading] = useState(false);

  // Listening history
  const [recent, setRecent]         = useState([]);   // normalized items for UI
  const [loadingRec, setLoadingRec] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [recError, setRecError]     = useState(null);
  const [hasMore, setHasMore]       = useState(true); // we stop when Spotify returns empty

  // Clear current list and related UI state whenever service changes
  useEffect(() => {
    setRecent([]);
    setRecError(null);
    setHasMore(service === 'spotify');
  }, [service]);

  // --- detect service from URL params ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    if (serviceParam === 'ytmusic') {
      setService('ytmusic');
    }
  }, []);

  // --- load Spotify identity (optional, nice UX) ---
  useEffect(() => {
    if (service !== 'spotify') return;
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error('No authenticated user');
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');
        const userProvider = user.app_metadata?.provider;
        const finalProvider = fromParam === 'google' ? 'google' : 
                             fromParam === 'spotify' ? 'spotify' : 
                             userProvider;
        setProvider(finalProvider);
        if (finalProvider === 'spotify') {
          const res = await fetch('/api/spotify/me', { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const me = await res.json();
          setUserInfo(me);
        } else if (finalProvider === 'google') {
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
        setMeError(String(err?.message || err));
      } finally {
        setLoadingMe(false);
      }
    })();
  }, [service]);

  // --- check YTMusic connection ---
  useEffect(() => {
    if (service !== 'ytmusic') return;
    (async () => {
      try {
        setYtmusicLoading(true);
        const result = await validateYTMusicConnection();
        setYtmusicConnected(result.success);
        if (result.success) {
          setMeError(null);
        } else {
          setMeError('YouTube Music not connected. Please install the Chrome extension and visit music.youtube.com');
        }
      } catch (err) {
        setMeError('YouTube Music not connected. Please install the Chrome extension and visit music.youtube.com');
        setYtmusicConnected(false);
      } finally {
        setYtmusicLoading(false);
        setLoadingMe(false);
      }
    })();
  }, [service]);

  // --- helper: map Spotify API -> UI row ---
  const mapSpotifyItem = useCallback((sp) => {
    const t = sp.track;
    return {
      id: `${t?.id || 'unknown'}-${sp.played_at}`,
      title: t?.name || 'Unknown',
      artist: t?.artists?.map(a => a.name).join(', ') || 'Unknown',
      album:  t?.album?.name || 'Unknown',
      cover:  t?.album?.images?.[1]?.url || t?.album?.images?.[0]?.url || '',
      playedAt: sp.played_at,
    };
  }, []);

  // --- helper: map YTMusic API -> UI row ---
  const mapYTMusicItem = useCallback((ytm) => {
    return {
      id: `${ytm.videoId}-${ytm.played}`,
      title: ytm.title,
      artist: ytm.artists?.join(', ') || 'Unknown',
      album: ytm.album || '',
      cover: ytm.thumbnail || '',
      playedAt: ytm.played,
    };
  }, []);

  // --- load first page of recently played ---
  useEffect(() => {
    (async () => {
      if (!provider && service === 'spotify') return;
      try {
        setLoadingRec(true);
        if (service === 'spotify') {
          const res = await fetch('/api/spotify/me/player/recently-played?limit=20', { cache: 'no-store' });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${body}`);
          }
          const json = await res.json();
          const items = (json.items || []).map(mapSpotifyItem);
          setRecent(items);
          setHasMore((json.items || []).length > 0);
        } else if (service === 'ytmusic') {
          const result = await getYTMusicHistory(50);
          if (result.success) {
            const items = (result.data || []).map(mapYTMusicItem);
            setRecent(items);
            setHasMore(false);
          } else {
            throw new Error('Failed to load YTMusic history');
          }
        }
        setRecError(null);
      } catch (err) {
        setRecError(String(err?.message || err));
      } finally {
        setLoadingRec(false);
      }
    })();
  }, [service, mapSpotifyItem, mapYTMusicItem, provider]);

  // --- load older history (only for Spotify) ---
  const loadMore = useCallback(async () => {
    if (!recent.length || service !== 'spotify') return; // Only Spotify supports pagination
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
      const more = (json.items || []).map(mapSpotifyItem);
      setRecent(prev => [...prev, ...more]);
      if (!json.items || json.items.length === 0) setHasMore(false);
    } catch (err) {
      setRecError(String(err?.message || err));
    } finally {
      setMoreLoading(false);
    }
  }, [recent, service, mapSpotifyItem]);

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
            <h3 className="text-xl font-semibold text-white mb-3">No recent plays yet</h3>
            <p className="text-base text-muted-foreground">Start listening to music to see your history here</p>
          </div>
        )}

        {recent.length > 0 && (
          <>
            <ul className="space-y-2">
              {recent.map((it) => <Row key={it.id} item={it} service={service} />)}
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
  }, [tab, recent, loadingRec, recError, hasMore, loadMore, service]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Your Library</h1>
        <p className="text-sm text-muted-foreground text-white/80">
          Your listening history and saved playlists
        </p>

        <div className="mt-3 flex items-center gap-3">
          {loadingMe && <span className="text-xs text-muted-foreground">Connecting…</span>}
          {meError && <span className="text-xs text-red-500 break-all">{meError}</span>}
          {service === 'spotify' && userInfo && (
            <>
              {userInfo.images?.[0]?.url && (
                <img
                  src={userInfo.images[0].url}
                  alt="Spotify avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-white">
                Signed in as <span className="font-medium">{userInfo.display_name}</span>
                <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded-full">Spotify</span>
              </span>
            </>
          )}
          {service === 'ytmusic' && ytmusicConnected && (
            <>
              <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
                <Youtube className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-white">
                Connected to <span className="font-medium">YouTube Music</span>
                <span className="ml-2 text-xs bg-red-600 px-2 py-1 rounded-full">YouTube Music</span>
              </span>
            </>
          )}
        </div>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          {TABS.map(({ key, label }) => (
            <TabButton key={key} isActive={tab === key} onClick={() => setTab(key)}>
              {label}
            </TabButton>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setService('spotify')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition ${
              service === 'spotify'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Music className="h-4 w-4" />
            Spotify
          </button>
          <button
            onClick={() => setService('ytmusic')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition ${
              service === 'ytmusic'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Youtube className="h-4 w-4" />
            YouTube Music
          </button>
        </div>
      </div>

      {content}
    </section>
  );
}