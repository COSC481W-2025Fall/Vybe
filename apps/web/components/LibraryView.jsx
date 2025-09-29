'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Clock, ListMusic, Music, Youtube } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { getYTMusicHistory, validateYTMusicConnection } from '@/app/lib/ytmusic';

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

function Row({ item, service }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent/30 transition">
      <div className="relative">
        <img
          src={item.cover}
          width={48}
          height={48}
          className="h-12 w-12 rounded-md object-cover"
          alt={`${item.title} cover`}
        />
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
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{item.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.artist} • {item.album}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{timeAgo(item.playedAt)}</span>
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

  // Spotify identity
  const [spotifyMe, setSpotifyMe]   = useState(null);
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
        console.log('[Supabase user]', user);

        const res = await fetch('/api/spotify/me', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const me = await res.json();
        setSpotifyMe(me);
        setMeError(null);
      } catch (err) {
        console.error('Failed to load Spotify profile', err);
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
        console.error('Failed to validate YTMusic connection', err);
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
      id: `${t.id}-${sp.played_at}`, // unique per play
      title: t.name,
      artist: t.artists?.map(a => a.name).join(', ') || 'Unknown',
      album:  t.album?.name || '',
      cover:  t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '',
      playedAt: sp.played_at,
    };
  }, []);

  // --- helper: map YTMusic API -> UI row ---
  const mapYTMusicItem = useCallback((ytm) => {
    return {
      id: `${ytm.videoId}-${ytm.played}`, // unique per play
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
      try {
        setLoadingRec(true);
        
        if (service === 'spotify') {
          const res = await fetch('/api/spotify/me/player/recently-played?limit=20', { cache: 'no-store' });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${body}`);
          }
          const json = await res.json();              // { items: [...], cursors, next }
          const items = (json.items || []).map(mapSpotifyItem);
          setRecent(items);
          setHasMore((json.items || []).length > 0);
        } else if (service === 'ytmusic') {
          const result = await getYTMusicHistory(50);
          if (result.success) {
            const items = (result.data || []).map(mapYTMusicItem);
            setRecent(items);
            setHasMore(false); // YTMusic doesn't support pagination yet
          } else {
            throw new Error('Failed to load YTMusic history');
          }
        }
        
        setRecError(null);
      } catch (err) {
        console.error('Failed to load listening history', err);
        setRecError(String(err?.message || err));
      } finally {
        setLoadingRec(false);
      }
    })();
  }, [service, mapSpotifyItem, mapYTMusicItem]);

  // --- load older history (uses "before" cursor = oldest played_at) ---
  const loadMore = useCallback(async () => {
    if (!recent.length || service !== 'spotify') return; // Only Spotify supports pagination
    try {
      setMoreLoading(true);
      const oldest = recent[recent.length - 1];
      const beforeMs = new Date(oldest.playedAt).getTime(); // Spotify expects ms
      const url = `/api/spotify/me/player/recently-played?limit=20&before=${beforeMs}`;
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
      console.error('Load more error', err);
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
      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xl backdrop-blur chroma-card mb-40 text-white">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Recent Listening History</span>
        </div>

        {loadingRec && (
          <p className="text-xs text-muted-foreground">Loading your recent plays…</p>
        )}
        {recError && (
          <p className="text-xs text-red-500 break-all">{recError}</p>
        )}

        {!loadingRec && !recError && recent.length === 0 && (
          <p className="text-sm text-muted-foreground">No recent plays yet.</p>
        )}

        {recent.length > 0 && (
          <>
            <ul className="divide-y divide-border/60">
              {recent.map((it) => <Row key={it.id} item={it} service={service} />)}
            </ul>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="rounded-full px-4 py-1.5 text-sm bg-white text-black shadow-sm disabled:opacity-60"
                >
                  {moreLoading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [tab, recent, loadingRec, recError, hasMore, loadMore]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Your Library</h1>
        <p className="text-sm text-muted-foreground text-white/80">
          Your listening history and saved playlists
        </p>

        {/* Service identity */}
        <div className="mt-3 flex items-center gap-3">
          {loadingMe && <span className="text-xs text-muted-foreground">Connecting to {service === 'spotify' ? 'Spotify' : 'YouTube Music'}…</span>}
          {meError && <span className="text-xs text-red-500 break-all">{meError}</span>}
          
          {service === 'spotify' && spotifyMe && (
            <>
              {spotifyMe.images?.[0]?.url && (
                <img
                  src={spotifyMe.images[0].url}
                  alt="Spotify avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-white">
                Signed in as <span className="font-medium">{spotifyMe.display_name}</span>
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
