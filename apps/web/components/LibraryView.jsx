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
    <li className="group flex items-center gap-4 rounded-xl px-4 py-4 hover:bg-white/10 transition-all duration-200 border border-transparent hover:border-white/20">
      <div className="relative">
        <img
          src={item.cover}
          width={56}
          height={56}
          className="h-14 w-14 rounded-lg object-cover shadow-lg group-hover:shadow-xl transition-shadow"
          alt={`${item.title} cover`}
        />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-white group-hover:text-yellow-400 transition-colors">
          {item.title}
        </div>
        <div className="truncate text-sm text-muted-foreground mt-0.5">
          {item.artist}
        </div>
        <div className="truncate text-xs text-muted-foreground/70 mt-0.5">
          {item.album}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full">
        <Clock className="h-3 w-3" />
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

  // Spotify identity
  const [spotifyMe, setSpotifyMe]   = useState(null);
  const [loadingMe, setLoadingMe]   = useState(true);
  const [meError, setMeError]       = useState(null);

  // Listening history
  const [recent, setRecent]         = useState([]);   // normalized items for UI
  const [loadingRec, setLoadingRec] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [recError, setRecError]     = useState(null);
  const [hasMore, setHasMore]       = useState(true); // we stop when Spotify returns empty

  // --- load Spotify identity (optional, nice UX) ---
  useEffect(() => {
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
  }, []);

  // --- helper: map Spotify API -> UI row ---
  const mapItem = useCallback((sp) => {
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

  // --- load first page of recently played ---
  useEffect(() => {
    (async () => {
      try {
        setLoadingRec(true);
        const res = await fetch('/api/spotify/me/player/recently-played?limit=20', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${body}`);
        }
        const json = await res.json();              // { items: [...], cursors, next }
        const items = (json.items || []).map(mapItem);
        setRecent(items);
        setHasMore((json.items || []).length > 0);
        setRecError(null);
      } catch (err) {
        console.error('Failed to load listening history', err);
        setRecError(String(err?.message || err));
      } finally {
        setLoadingRec(false);
      }
    })();
  }, [mapItem]);

  // --- load older history (uses "before" cursor = oldest played_at) ---
  const loadMore = useCallback(async () => {
    if (!recent.length) return;
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
      const more = (json.items || []).map(mapItem);
      setRecent(prev => [...prev, ...more]);
      if (!json.items || json.items.length === 0) setHasMore(false);
    } catch (err) {
      console.error('Load more error', err);
      setRecError(String(err?.message || err));
    } finally {
      setMoreLoading(false);
    }
  }, [recent, mapItem]);

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
      <div className="vybe-aurora rounded-2xl border border-white/20 bg-white/5 p-6 shadow-2xl backdrop-blur-sm mb-40 text-white">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 bg-yellow-400/20 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Recent Listening History</h2>
            <p className="text-sm text-muted-foreground">Your latest musical journey</p>
          </div>
        </div>

        {loadingRec && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            <span className="ml-3 text-sm text-muted-foreground">Loading your recent plays…</span>
          </div>
        )}
        {recError && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{recError}</p>
          </div>
        )}

        {!loadingRec && !recError && recent.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No recent plays yet</h3>
            <p className="text-sm text-muted-foreground">Start listening to music to see your history here</p>
          </div>
        )}

        {recent.length > 0 && (
          <>
            <ul className="space-y-2">
              {recent.map((it) => <Row key={it.id} item={it} />)}
            </ul>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={moreLoading}
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm bg-yellow-400 hover:bg-yellow-500 text-black font-medium shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {moreLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
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
    <section className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-white">Your Library</h1>
        <p className="text-sm text-muted-foreground text-white/80">
          Your listening history and saved playlists
        </p>

        {/* Spotify identity */}
        <div className="mt-3 flex items-center gap-3">
          {loadingMe && <span className="text-xs text-muted-foreground">Connecting to Spotify…</span>}
          {meError && <span className="text-xs text-red-500 break-all">{meError}</span>}
          {spotifyMe && (
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
